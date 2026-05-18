import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { signAccessToken } from '../_shared/jwt.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (Deno.env.get('ALLOW_DEV_AUTH') !== 'true') {
    return jsonResponse({ error: 'Dev auth is disabled in this environment' }, 403);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: { userId?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const userId = body.userId ?? 'dev_user_local';
  const name = body.name ?? 'Разработчик';

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
