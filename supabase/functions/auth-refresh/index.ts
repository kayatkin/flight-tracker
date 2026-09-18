import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  claimsFromRow,
  clampTtlSeconds,
  issueAuthSession,
  lookupRefresh,
  revokeFamily,
} from '../_shared/authSession.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { effectiveGuestPermissions } from '../_shared/guestAccess.ts';
import { RATE_LIMITS, rateLimitResponse } from '../_shared/rateLimit.ts';

const fail = (req: Request, error: string, status = 401) =>
  jsonResponse({ ok: false, error }, status, req);

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  const limited = rateLimitResponse(req, 'auth-refresh', RATE_LIMITS['auth-refresh']);
  if (limited) return limited;

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405, req);
  }

  let body: { refresh_token?: string; revoke?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400, req);
  }

  const refreshToken = body.refresh_token?.trim() ?? '';
  if (!refreshToken) {
    return fail(req, 'refresh_token is required', 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const row = await lookupRefresh(admin, refreshToken);
  if (!row) {
    return fail(req, 'Invalid refresh token');
  }

  if (row.revoked_at) {
    await revokeFamily(admin, row.family_id);
    return fail(req, 'Refresh token reused');
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await revokeFamily(admin, row.family_id);
    return fail(req, 'Refresh token expired');
  }

  if (body.revoke) {
    await revokeFamily(admin, row.family_id);
    return jsonResponse({ ok: true, revoked: true }, 200, req);
  }

  let accessTtl = ACCESS_TOKEN_TTL_SECONDS;
  const refreshRemaining = Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000);

  if (row.app_role === 'guest') {
    if (!row.share_session_id) {
      await revokeFamily(admin, row.family_id);
      return fail(req, 'Invalid guest session');
    }
    const { data: session } = await admin
      .from('shared_sessions')
      .select('is_active, expires_at, permissions')
      .eq('id', row.share_session_id)
      .maybeSingle();
    if (!session || session.is_active !== true) {
      await revokeFamily(admin, row.family_id);
      return fail(req, 'Share session revoked');
    }
    const shareRemaining = Math.floor(
      (new Date(String(session.expires_at)).getTime() - Date.now()) / 1000
    );
    if (shareRemaining < 60) {
      await revokeFamily(admin, row.family_id);
      return fail(req, 'Share session expired');
    }
    accessTtl = clampTtlSeconds(shareRemaining, ACCESS_TOKEN_TTL_SECONDS);
    row.permissions = effectiveGuestPermissions(session.permissions);
  } else {
    accessTtl = clampTtlSeconds(refreshRemaining, ACCESS_TOKEN_TTL_SECONDS);
  }

  try {
    const issued = await issueAuthSession(admin, claimsFromRow(row), {
      accessTtl,
      refreshTtl: Math.max(60, refreshRemaining),
      familyId: row.family_id,
      replaceId: row.id,
    });
    return jsonResponse({
      ok: true,
      access_token: issued.access_token,
      refresh_token: issued.refresh_token,
      expires_in: issued.expires_in,
      userId: row.user_id,
      name: row.name,
      app_role: row.app_role,
    }, 200, req);
  } catch {
    return jsonResponse({ ok: false, error: 'Failed to rotate session' }, 500, req);
  }
});
