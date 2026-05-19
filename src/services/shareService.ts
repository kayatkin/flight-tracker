import { supabase } from '@shared/lib';
import { PLAN_LIMITS, type PlanId } from '@shared/constants/subscription';
import { generateShareToken } from '@shared/utils/id';
import { canCreateShareLink } from '@shared/utils/subscriptionLimits';
import { buildShareUrl } from './shareUrls';

export class ShareLimitError extends Error {
  readonly code = 'SHARE_LIMIT' as const;
  readonly maxLinks: number;

  constructor(maxLinks: number) {
    super('SHARE_LIMIT');
    this.maxLinks = maxLinks;
  }
}

export async function countActiveShareSessions(ownerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('shared_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;
  return count ?? 0;
}

export type SharePermissions = 'view' | 'edit';
export { buildShareUrl } from './shareUrls';

export interface CreateShareSessionParams {
  ownerId: string;
  permissions: SharePermissions;
  expiryDays: number;
}

export interface ShareSessionResult {
  token: string;
  url: string;
  expiresAt: string;
}

export const createShareSession = async ({
  ownerId,
  permissions,
  expiryDays,
  plan = 'free',
}: CreateShareSessionParams & { plan?: PlanId }): Promise<ShareSessionResult> => {
  const activeCount = await countActiveShareSessions(ownerId);
  if (!canCreateShareLink(plan, activeCount)) {
    throw new ShareLimitError(PLAN_LIMITS[plan].maxShareLinks);
  }

  const token = generateShareToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const { error } = await supabase.from('shared_sessions').insert({
    owner_id: ownerId,
    token,
    permissions,
    expires_at: expiresAt.toISOString(),
    is_active: true,
  });

  if (error) throw error;

  return {
    token,
    url: buildShareUrl(token, permissions),
    expiresAt: expiresAt.toISOString(),
  };
};

export const revokeShareSession = async (token: string): Promise<void> => {
  const { error } = await supabase
    .from('shared_sessions')
    .update({ is_active: false })
    .eq('token', token);

  if (error) throw error;
};
