import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions, jsonResponse } from '../_shared/cors.ts';
import { parseTelegramUser, validateTelegramInitData } from '../_shared/telegram.ts';
import { signAccessToken } from '../_shared/jwt.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const botToken = Deno.env.get('BOT_TOKEN');
  if (!botToken) {
    return jsonResponse({ error: 'BOT_TOKEN secret is not configured' }, 500);
  }

  let body: { initData?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { initData } = body;
  if (!initData || !(await validateTelegramInitData(initData, botToken))) {
    return jsonResponse({ error: 'Invalid Telegram initData' }, 401);
  }

  const tgUser = parseTelegramUser(initData);
  if (!tgUser?.id) {
    return jsonResponse({ error: 'No Telegram user in initData' }, 400);
  }

  const userId = `tg_${tgUser.id}`;
  const name = tgUser.first_name ?? tgUser.username ?? 'User';

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  await admin.from('users').upsert({
    user_id: userId,
    name,
    updated_at: new Date().toISOString(),
  });

  const access_token = await signAccessToken({
    sub: userId,
    user_id: userId,
    app_role: 'owner',
    name,
  });

  return jsonResponse({
    access_token,
    refresh_token: access_token,
    userId,
    name,
    expires_in: 60 * 60 * 24 * 7,
  });
});
