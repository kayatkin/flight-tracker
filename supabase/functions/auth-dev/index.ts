import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  OWNER_REFRESH_TTL_SECONDS,
  issueAuthSession,
  revokeActiveForOwner,
} from '../_shared/authSession.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (Deno.env.get('ALLOW_DEV_AUTH') !== 'true') {
    return jsonResponse({ error: 'Dev auth is disabled in this environment' }, 403, req);
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  let body: { userId?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, req);
  }

  const userId = body.userId ?? 'dev_user_local';
  const name = body.name ?? 'Разработчик';

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
