export interface AppJwtClaims {
  sub: string;
  user_id: string;
  app_role: 'owner' | 'guest';
  permissions?: 'view' | 'edit';
  name?: string;
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlEncodeJson(obj: unknown): string {
  return base64UrlEncode(encoder.encode(JSON.stringify(obj)));
}

const encoder = new TextEncoder();

async function signHs256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

/** Signs a Supabase-compatible access token (HS256). */
export async function signAccessToken(
  claims: AppJwtClaims,
  expiresInSeconds = 60 * 60 * 24 * 7
): Promise<string> {
  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set. Add it via: supabase secrets set JWT_SECRET=<your-jwt-secret>');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    aud: 'authenticated',
    exp: now + expiresInSeconds,
    iat: now,
    iss: 'supabase',
    role: 'authenticated',
    ...claims,
  };

  const encodedHeader = base64UrlEncodeJson(header);
  const encodedPayload = base64UrlEncodeJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHs256(signingInput, jwtSecret);

  return `${signingInput}.${signature}`;
}
