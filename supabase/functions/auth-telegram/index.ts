import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { RATE_LIMITS, rateLimitResponse } from '../_shared/rateLimit.ts';
import { parseTelegramUser, validateTelegramInitData } from '../_shared/telegram.ts';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  OWNER_REFRESH_TTL_SECONDS,
  issueAuthSession,
  revokeActiveForOwner,
} from '../_shared/authSession.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  const limited = rateLimitResponse(req, 'auth-telegram', RATE_LIMITS['auth-telegram']);
  if (limited) return limited;

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

  const telegramKey = `tg_${tgUser.id}`;
  const name = tgUser.first_name ?? tgUser.username ?? 'User';

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error: upsertError } = await admin.from('users').upsert({
    user_id: telegramKey,
    name,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    return jsonResponse({ error: 'Failed to persist user profile' }, 500, req);
  }

  const { data: identity } = await admin
    .from('user_identities')
    .select('user_id')
    .eq('provider', 'telegram')
    .eq('provider_user_id', telegramKey)
    .maybeSingle();

  let userId = identity?.user_id ?? telegramKey;

  if (!identity) {
    const { error: identityError } = await admin.from('user_identities').insert({
      user_id: telegramKey,
      provider: 'telegram',
      provider_user_id: telegramKey,
    });
    if (identityError) {
      const { data: raced } = await admin
        .from('user_identities')
        .select('user_id')
        .eq('provider', 'telegram')
        .eq('provider_user_id', telegramKey)
        .maybeSingle();
      userId = raced?.user_id ?? telegramKey;
    }
  }

  if (userId !== telegramKey) {
    await admin.from('users').upsert({
      user_id: userId,
      name,
      updated_at: new Date().toISOString(),
    });
  }

  try {
    await revokeActiveForOwner(admin, userId);
    const issued = await issueAuthSession(admin, {
      sub: userId,
      user_id: userId,
      app_role: 'owner',
      name,
    }, {
      accessTtl: ACCESS_TOKEN_TTL_SECONDS,
      refreshTtl: OWNER_REFRESH_TTL_SECONDS,
    });

    return jsonResponse({
      access_token: issued.access_token,
      refresh_token: issued.refresh_token,
      userId,
      name,
      expires_in: issued.expires_in,
    }, 200, req);
  } catch {
    return jsonResponse({ error: 'Failed to persist session' }, 500, req);
  }
});
