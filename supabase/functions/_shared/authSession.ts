import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sha256Hex } from './hashToken.ts';
import { type AppJwtClaims, signAccessToken } from './jwt.ts';

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const OWNER_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;
export const GUEST_REFRESH_MAX_SECONDS = 60 * 60 * 24;

export const clampTtlSeconds = (remainingSeconds: number, cap: number): number =>
  Math.max(60, Math.min(cap, remainingSeconds));

const base64UrlEncode = (data: Uint8Array): string =>
  btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export const randomRefreshToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(bytes);
};

export type StoredRefresh = {
  id: string;
  family_id: string;
  subject: string;
  user_id: string;
  app_role: 'owner' | 'guest';
  permissions: 'view' | 'edit' | null;
  share_session_id: string | null;
  name: string | null;
  expires_at: string;
  revoked_at: string | null;
};

export type IssuedSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export const claimsFromRow = (row: StoredRefresh): AppJwtClaims => ({
  sub: row.subject,
  user_id: row.user_id,
  app_role: row.app_role,
  permissions: row.permissions ?? undefined,
  name: row.name ?? undefined,
  share_session_id: row.share_session_id ?? undefined,
});

export async function revokeFamily(
  admin: SupabaseClient,
  familyId: string
): Promise<void> {
  await admin
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('family_id', familyId)
    .is('revoked_at', null);
}

export async function revokeActiveForOwner(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  await admin
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('app_role', 'owner')
    .is('revoked_at', null);
}

export async function revokeActiveForShareSession(
  admin: SupabaseClient,
  shareSessionId: string
): Promise<void> {
  await admin
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('share_session_id', shareSessionId)
    .is('revoked_at', null);
}

export async function issueAuthSession(
  admin: SupabaseClient,
  claims: AppJwtClaims,
  opts: {
    accessTtl: number;
    refreshTtl: number;
    familyId?: string;
    replaceId?: string;
  }
): Promise<IssuedSession> {
  const refreshToken = randomRefreshToken();
  const tokenHash = await sha256Hex(refreshToken);
  const familyId = opts.familyId ?? crypto.randomUUID();
  const expiresAt = new Date(Date.now() + opts.refreshTtl * 1000).toISOString();

  const { data, error } = await admin
    .from('refresh_tokens')
    .insert({
      family_id: familyId,
      token_hash: tokenHash,
      subject: claims.sub,
      user_id: claims.user_id,
      app_role: claims.app_role,
      permissions: claims.permissions ?? null,
      share_session_id: claims.share_session_id ?? null,
      name: claims.name ?? null,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error('Failed to persist refresh token');
  }

  if (opts.replaceId) {
    await admin
      .from('refresh_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        replaced_by: data.id,
      })
      .eq('id', opts.replaceId);
  }

  const access_token = await signAccessToken(claims, opts.accessTtl);
  return {
    access_token,
    refresh_token: refreshToken,
    expires_in: opts.accessTtl,
  };
}

export async function lookupRefresh(
  admin: SupabaseClient,
  refreshToken: string
): Promise<StoredRefresh | null> {
  const tokenHash = await sha256Hex(refreshToken);
  const { data } = await admin
    .from('refresh_tokens')
    .select(
      'id, family_id, subject, user_id, app_role, permissions, share_session_id, name, expires_at, revoked_at'
    )
    .eq('token_hash', tokenHash)
    .maybeSingle();
  return (data as StoredRefresh | null) ?? null;
}
