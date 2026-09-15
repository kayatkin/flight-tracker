import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { decideEditBind } from '../_shared/guestAccess.ts';
import { RATE_LIMITS, rateLimitResponse } from '../_shared/rateLimit.ts';
import { sha256Hex } from '../_shared/hashToken.ts';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  clampTtlSeconds,
  GUEST_REFRESH_MAX_SECONDS,
  issueAuthSession,
  revokeActiveForShareSession,
} from '../_shared/authSession.ts';
import { parseTelegramUser, validateTelegramInitData } from '../_shared/telegram.ts';

const isMissingColumnError = (error: { message?: string; code?: string } | null): boolean => {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return error.code === '42703' || message.includes('does not exist') || message.includes('token_hash') || message.includes('bound_telegram_user_id');
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  const limited = rateLimitResponse(req, 'auth-guest', RATE_LIMITS['auth-guest']);
  if (limited) return limited;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  let body: { token?: string; initData?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, req);
  }

  const { token } = body;
  if (!token) {
    return jsonResponse({ error: 'token is required' }, 400, req);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const nowIso = new Date().toISOString();
  const tokenHash = await sha256Hex(token);

  let session: Record<string, unknown> | null = null;

  const hashed = await admin
    .from('shared_sessions')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('is_active', true)
    .gt('expires_at', nowIso)
    .maybeSingle();

  if (hashed.data) {
    session = hashed.data as Record<string, unknown>;
  } else if (!isMissingColumnError(hashed.error)) {
    const plain = await admin
      .from('shared_sessions')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', nowIso)
      .maybeSingle();
    if (plain.data) {
      session = plain.data as Record<string, unknown>;
    }
  } else {
    const plain = await admin
      .from('shared_sessions')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', nowIso)
      .maybeSingle();
    if (plain.data) {
      session = plain.data as Record<string, unknown>;
    }
  }

  if (!session) {
    return jsonResponse({ error: 'Invalid or expired share token' }, 401, req);
  }

  let permissions: 'view' | 'edit' = session.permissions === 'edit' ? 'edit' : 'view';
  const sessionId = String(session.id ?? '');
  const ownerId = String(session.owner_id ?? '');

  if (permissions === 'edit') {
    const botToken = Deno.env.get('BOT_TOKEN');
    const tgUser = body.initData && botToken && (await validateTelegramInitData(body.initData, botToken))
      ? parseTelegramUser(body.initData)
      : null;

    if (!tgUser?.id) {
      permissions = 'view';
    } else {
      const telegramId = String(tgUser.id);
      const boundId = session.bound_telegram_user_id
        ? String(session.bound_telegram_user_id)
        : '';

      if (!boundId) {
        const bind = await admin
          .from('shared_sessions')
          .update({ bound_telegram_user_id: telegramId })
          .eq('id', sessionId)
          .is('bound_telegram_user_id', null)
          .select('id')
          .maybeSingle();
        if (bind.error && isMissingColumnError(bind.error)) {
          // Column missing on old schema: cannot bind, keep invite permission.
        } else if (bind.error) {
          console.error('[auth-guest] failed to bind telegram user', bind.error);
          permissions = 'view';
        } else if (!bind.data) {
          const again = await admin
            .from('shared_sessions')
            .select('bound_telegram_user_id')
            .eq('id', sessionId)
            .maybeSingle();
          permissions = decideEditBind({
            telegramId,
            existingBoundId: '',
            claimedBind: false,
            winnerBoundId: again.data?.bound_telegram_user_id
              ? String(again.data.bound_telegram_user_id)
              : '',
          });
        }
      } else {
        permissions = decideEditBind({
          telegramId,
          existingBoundId: boundId,
          claimedBind: false,
        });
      }
    }
  }

  const guestSub = `guest_${crypto.randomUUID()}`;
  const remainingMs = new Date(String(session.expires_at)).getTime() - Date.now();
  const remainingSeconds = Number.isFinite(remainingMs) ? Math.floor(remainingMs / 1000) : 60;
  const refreshTtl = clampTtlSeconds(remainingSeconds, GUEST_REFRESH_MAX_SECONDS);
  const accessTtl = clampTtlSeconds(remainingSeconds, ACCESS_TOKEN_TTL_SECONDS);

  const { data: ownerRow } = await admin
    .from('users')
    .select('name')
    .eq('user_id', ownerId)
    .maybeSingle();

  const ownerName =
    ownerRow?.name ??
    (ownerId.startsWith('tg_')
      ? `Пользователь #${ownerId.replace('tg_', '').slice(0, 6)}`
      : 'Владелец');

  try {
    await revokeActiveForShareSession(admin, sessionId);
    const issued = await issueAuthSession(admin, {
      sub: guestSub,
      user_id: ownerId,
      app_role: 'guest',
      permissions,
      name: ownerName,
      share_session_id: sessionId,
    }, {
      accessTtl,
      refreshTtl,
    });

    return jsonResponse({
      access_token: issued.access_token,
      refresh_token: issued.refresh_token,
      guestUser: {
        userId: guestSub,
        name: 'Гость',
        isGuest: true,
        sessionToken: '',
        permissions,
        ownerId,
        ownerName,
      },
      expires_in: issued.expires_in,
    }, 200, req);
  } catch {
    return jsonResponse({ error: 'Failed to persist session' }, 500, req);
  }
});
