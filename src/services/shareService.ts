import { supabase } from '@shared/lib';
import { generateShareToken } from '@shared/utils/id';
import { hashShareToken } from '@shared/utils/hashShareToken';
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

const shouldUseLegacyShareInsert = (error: { message?: string; code?: string } | null): boolean => {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return (
    error.code === '42703' ||
    error.code === '23502' ||
    message.includes('token_hash') ||
    message.includes('null value') ||
    message.includes('does not exist')
  );
};

export const createShareSession = async ({
  ownerId,
  permissions,
  expiryDays,
}: CreateShareSessionParams): Promise<ShareSessionResult> => {
  const token = generateShareToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);
  const expiresAtIso = expiresAt.toISOString();
  const tokenHash = await hashShareToken(token);

  const hashedInsert = await supabase.from('shared_sessions').insert({
    owner_id: ownerId,
    token: null,
    token_hash: tokenHash,
    permissions,
    expires_at: expiresAtIso,
    is_active: true,
  });

  if (hashedInsert.error) {
    if (!shouldUseLegacyShareInsert(hashedInsert.error)) {
      throw hashedInsert.error;
    }

    const legacyInsert = await supabase.from('shared_sessions').insert({
      owner_id: ownerId,
      token,
      permissions,
      expires_at: expiresAtIso,
      is_active: true,
    });
    if (legacyInsert.error) throw legacyInsert.error;
  }

  return {
    token,
    url: buildShareUrl(token, permissions),
    expiresAt: expiresAtIso,
  };
};

export const revokeShareSession = async (token: string): Promise<void> => {
  const tokenHash = await hashShareToken(token);

  const byHash = await supabase
    .from('shared_sessions')
    .update({ is_active: false })
    .eq('token_hash', tokenHash)
    .select('id');

  if (!byHash.error && (byHash.data?.length ?? 0) > 0) {
    return;
  }

  const byToken = await supabase
    .from('shared_sessions')
    .update({ is_active: false })
    .eq('token', token)
    .select('id');

  if (byToken.error) throw byToken.error;
};
