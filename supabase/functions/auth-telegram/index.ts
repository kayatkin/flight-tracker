import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { parseTelegramUser, validateTelegramInitData } from '../_shared/telegram.ts';
import { OWNER_TOKEN_TTL_SECONDS, signAccessToken } from '../_shared/jwt.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  const botToken = Deno.env.get('BOT_TOKEN');
  if (!botToken) {
    return jsonResponse({ error: 'BOT_TOKEN secret is not configured' }, 500, req);
  }

  let body: { initData?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, req);
  }

  const { initData } = body;
  if (!initData || !(await validateTelegramInitData(initData, botToken))) {
    return jsonResponse({ error: 'Invalid Telegram initData' }, 401, req);
  }

  const tgUser = parseTelegramUser(initData);
  if (!tgUser?.id) {
    return jsonResponse({ error: 'No Telegram user in initData' }, 400, req);
  }

  const userId = `tg_${tgUser.id}`;
  const name = tgUser.first_name ?? tgUser.username ?? 'User';

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error: upsertError } = await admin.from('users').upsert({
    user_id: userId,
    name,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    return jsonResponse({ error: 'Failed to persist user profile' }, 500, req);
  }

  const access_token = await signAccessToken({
    sub: userId,
    user_id: userId,
    app_role: 'owner',
    name,
  }, OWNER_TOKEN_TTL_SECONDS);

  return jsonResponse({
    access_token,
    refresh_token: access_token,
    userId,
    name,
    expires_in: OWNER_TOKEN_TTL_SECONDS,
  }, 200, req);
});
