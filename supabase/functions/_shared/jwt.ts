export interface AppJwtClaims {
  sub: string;
  user_id: string;
  app_role: 'owner' | 'guest';
  permissions?: 'view' | 'edit';
  name?: string;
  share_session_id?: string;
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
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const OWNER_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;
/** @deprecated Use ACCESS_TOKEN_TTL_SECONDS; kept for older imports. */
export const OWNER_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS;
export const DEFAULT_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS;

export async function signAccessToken(
  claims: AppJwtClaims,
  expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS
): Promise<string> {
  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set. Add it via: supabase secrets set JWT_SECRET=<your-jwt-secret>');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    ...claims,
    ft: 'custom',
    aud: 'authenticated',
    exp: now + expiresInSeconds,
    iat: now,
    iss: 'supabase',
    role: 'authenticated',
  };

  const encodedHeader = base64UrlEncodeJson(header);
  const encodedPayload = base64UrlEncodeJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHs256(signingInput, jwtSecret);

  return `${signingInput}.${signature}`;
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (input.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let result = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    result |= aBytes[i] ^ bBytes[i];
  }
  return result === 0;
}

export interface VerifiedOwner {
  userId: string;
  name?: string;
}

/** Verifies HS256 access tokens issued by auth-* or GoTrue. Guests are rejected. */
export async function verifyOwnerToken(token: string): Promise<VerifiedOwner | null> {
  const jwtSecret = Deno.env.get('JWT_SECRET');
  if (!jwtSecret) return null;

  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;

  const signingInput = `${parts[0]}.${parts[1]}`;
  const expected = await signHs256(signingInput, jwtSecret);
  if (!timingSafeEqual(expected, parts[2])) return null;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as Record<string, unknown>;
  } catch {
    return null;
  }

  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (exp && exp < Math.floor(Date.now() / 1000)) return null;

  if (payload.app_role === 'guest') return null;
  if (payload.app_role !== 'owner' && payload.role !== 'authenticated') return null;

  const userId = String(payload.user_id ?? payload.sub ?? '');
  if (!userId) return null;

  const name = typeof payload.name === 'string' ? payload.name : undefined;
  return { userId, name };
}

export const bearerToken = (req: Request): string | null => {
  const header = req.headers.get('Authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};
