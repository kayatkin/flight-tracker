import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { signAccessToken } from '../_shared/jwt.ts';
import { parseTelegramUser, validateTelegramInitData } from '../_shared/telegram.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: { token?: string; initData?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { token } = body;
  if (!token) {
    return jsonResponse({ error: 'token is required' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: session, error } = await admin
    .from('shared_sessions')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !session) {
    return jsonResponse({ error: 'Invalid or expired share token' }, 401);
  }

  let permissions: 'view' | 'edit' = session.permissions === 'edit' ? 'edit' : 'view';

  // Edit permission requires verified Telegram user
  if (permissions === 'edit' && body.initData) {
    const botToken = Deno.env.get('BOT_TOKEN');
    if (
      botToken &&
      (await validateTelegramInitData(body.initData, botToken)) &&
      parseTelegramUser(body.initData)?.id
    ) {
      // keep edit
    } else {
      permissions = 'view';
    }
  } else if (permissions === 'edit') {
    permissions = 'view';
  }

  const secondsUntilSessionExpires = Math.floor(
    (new Date(session.expires_at).getTime() - Date.now()) / 1000
  );
  if (!Number.isFinite(secondsUntilSessionExpires) || secondsUntilSessionExpires <= 0) {
    return jsonResponse({ error: 'Invalid or expired share token' }, 401);
  }

  const tokenTtlSeconds = Math.max(1, Math.min(60 * 60 * 24, secondsUntilSessionExpires));
  const guestSub = `guest_${crypto.randomUUID()}`;
  const access_token = await signAccessToken(
    {
      sub: guestSub,
      user_id: session.owner_id,
      app_role: 'guest',
      permissions,
      session_token: token,
    },
    tokenTtlSeconds
  );

  const { data: ownerRow } = await admin
    .from('users')
    .select('name')
    .eq('user_id', session.owner_id)
    .maybeSingle();

  const ownerName =
    ownerRow?.name ??
    (session.owner_id.startsWith('tg_')
      ? `Пользователь #${session.owner_id.replace('tg_', '').slice(0, 6)}`
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
      ownerId: session.owner_id,
      ownerName,
    },
    expires_in: tokenTtlSeconds,
  });
});
