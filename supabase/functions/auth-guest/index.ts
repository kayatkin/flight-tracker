import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { sha256Hex } from '../_shared/hashToken.ts';
import { signAccessToken } from '../_shared/jwt.ts';
import { parseTelegramUser, validateTelegramInitData } from '../_shared/telegram.ts';

const isMissingColumnError = (error: { message?: string; code?: string } | null): boolean => {
  if (!error) return false;
  const message = (error.message ?? '').toLowerCase();
  return error.code === '42703' || message.includes('does not exist') || message.includes('token_hash') || message.includes('bound_telegram_user_id');
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

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
          .eq('id', sessionId);
        if (bind.error && !isMissingColumnError(bind.error)) {
          console.error('[auth-guest] failed to bind telegram user', bind.error);
        }
      } else if (boundId !== telegramId) {
        permissions = 'view';
      }
    }
  }

  const guestSub = `guest_${crypto.randomUUID()}`;
  const remainingMs = new Date(String(session.expires_at)).getTime() - Date.now();
  const remainingSeconds = Number.isFinite(remainingMs) ? Math.floor(remainingMs / 1000) : 60;
  const expiresIn = Math.max(60, Math.min(60 * 60 * 24, remainingSeconds));
  const access_token = await signAccessToken({
    sub: guestSub,
    user_id: ownerId,
    app_role: 'guest',
    permissions,
    share_session_id: sessionId,
  }, expiresIn);

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

  return jsonResponse({
    access_token,
    refresh_token: access_token,
    guestUser: {
      userId: guestSub,
      name: 'Гость',
      isGuest: true,
      sessionToken: token,
      permissions,
      ownerId,
      ownerName,
    },
    expires_in: expiresIn,
  }, 200, req);
});
