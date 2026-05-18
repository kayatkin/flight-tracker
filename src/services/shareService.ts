import { supabase } from '@shared/lib';
import { generateShareToken } from '@shared/utils/id';
import { buildShareUrl } from './shareUrls';

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
}: CreateShareSessionParams): Promise<ShareSessionResult> => {
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
