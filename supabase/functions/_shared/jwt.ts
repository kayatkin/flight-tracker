export interface AppJwtClaims {
  sub: string;
  user_id: string;
  app_role: 'owner' | 'guest';
  permissions?: 'view' | 'edit';
  name?: string;
  share_session_id?: string;
}

export interface PublicJwk {
  kty: string;
  kid?: string;
  alg?: string;
  use?: string;
  crv?: string;
  x?: string;
  y?: string;
  n?: string;
  e?: string;
}

export interface JwksDocument {
  keys: PublicJwk[];
}

export type JwksLoader = () => Promise<JwksDocument>;

export interface VerifyOwnerOptions {
  loadJwks?: JwksLoader;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

let jwksCache: { fetchedAt: number; keys: PublicJwk[] } | null = null;

function getEnv(name: string): string | undefined {
  const value = Deno.env.get(name);
  return value && value.trim() ? value.trim() : undefined;
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

interface EcPrivateSigningKey {
  kid: string;
  jwk: JsonWebKey;
}

/** Parses JWT_SIGNING_PRIVATE_JWK. Missing env → null; malformed → throw (do not fall back to HS256). */
function parsePrivateSigningKey(): EcPrivateSigningKey | null {
  const raw = getEnv('JWT_SIGNING_PRIVATE_JWK');
  if (!raw) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error('JWT_SIGNING_PRIVATE_JWK is not valid JSON');
  }

  if (
    parsed.kty !== 'EC'
    || parsed.crv !== 'P-256'
    || !isNonEmptyString(parsed.d)
    || !isNonEmptyString(parsed.x)
    || !isNonEmptyString(parsed.y)
  ) {
    throw new Error('JWT_SIGNING_PRIVATE_JWK must be an ES256 (P-256) private JWK');
  }

  const kid = getEnv('JWT_SIGNING_KID') ?? (isNonEmptyString(parsed.kid) ? parsed.kid : '');
  if (!kid) {
    throw new Error('JWT_SIGNING_PRIVATE_JWK is missing kid (or set JWT_SIGNING_KID)');
  }

  return {
    kid,
    jwk: {
      kty: 'EC',
      crv: 'P-256',
      x: parsed.x,
      y: parsed.y,
      d: parsed.d,
    },
  };
}

async function signHs256(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return base64UrlEncode(new Uint8Array(sig));
}

async function signEs256(message: string, jwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(message),
  );
  return base64UrlEncode(new Uint8Array(sig));
}

async function defaultLoadJwks(): Promise<JwksDocument> {
  const base = getEnv('SUPABASE_URL')?.replace(/\/$/, '');
  if (!base) throw new Error('SUPABASE_URL is not set');
  const res = await fetch(`${base}/auth/v1/.well-known/jwks.json`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = await res.json() as JwksDocument;
  if (!body || !Array.isArray(body.keys)) {
    throw new Error('JWKS document is missing keys');
  }
  return body;
}

async function loadJwksKeys(loader: JwksLoader): Promise<PublicJwk[] | null> {
  try {
    const doc = await loader();
    return Array.isArray(doc.keys) ? doc.keys : [];
  } catch {
    return null;
  }
}

async function findJwksKey(kid: string, loader: JwksLoader): Promise<PublicJwk | null> {
  const now = Date.now();
  if (!jwksCache || now - jwksCache.fetchedAt > JWKS_CACHE_TTL_MS) {
    const keys = await loadJwksKeys(loader);
    if (keys) jwksCache = { fetchedAt: now, keys };
  }

  let found = jwksCache?.keys.find((key) => key.kid === kid);
  if (found) return found;

  const keys = await loadJwksKeys(loader);
  if (keys) {
    jwksCache = { fetchedAt: Date.now(), keys };
    found = keys.find((key) => key.kid === kid);
  }
  return found ?? null;
}

function importVerifyKey(alg: 'ES256' | 'RS256', jwk: PublicJwk): Promise<CryptoKey> {
  if (alg === 'ES256') {
    return crypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
  }
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'RSA', n: jwk.n, e: jwk.e },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

async function verifyAsymmetric(
  alg: 'ES256' | 'RS256',
  jwk: PublicJwk,
  message: string,
  signature: Uint8Array,
): Promise<boolean> {
  try {
    const sig = new Uint8Array(signature);
    if (alg === 'ES256' && sig.length !== 64) return false;
    const key = await importVerifyKey(alg, jwk);
    if (alg === 'ES256') {
      return await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        sig,
        encoder.encode(message),
      );
    }
    return await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      sig,
      encoder.encode(message),
    );
  } catch {
    return false;
  }
}

function ownerFromPayload(payload: Record<string, unknown>): VerifiedOwner | null {
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (exp && exp < Math.floor(Date.now() / 1000)) return null;

  if (payload.app_role === 'guest') return null;
  if (payload.app_role !== 'owner' && payload.role !== 'authenticated') return null;

  const userId = String(payload.user_id ?? payload.sub ?? '');
  if (!userId) return null;

  const name = typeof payload.name === 'string' ? payload.name : undefined;
  return { userId, name };
}

/** Clears the in-memory JWKS cache. Tests only. */
export function resetJwksCacheForTests(): void {
  jwksCache = null;
}

/** Signs a Supabase-compatible access token (ES256 when a private JWK is set, otherwise HS256). */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const OWNER_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;
/** @deprecated Use ACCESS_TOKEN_TTL_SECONDS; kept for older imports. */
export const OWNER_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS;
export const DEFAULT_TOKEN_TTL_SECONDS = ACCESS_TOKEN_TTL_SECONDS;

export async function signAccessToken(
  claims: AppJwtClaims,
  expiresInSeconds = DEFAULT_TOKEN_TTL_SECONDS,
): Promise<string> {
  const asymmetric = parsePrivateSigningKey();
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...claims,
    ft: 'custom',
    aud: 'authenticated',
    exp: now + expiresInSeconds,
    iat: now,
    iss: 'supabase',
    role: 'authenticated',
  };
  const encodedPayload = base64UrlEncodeJson(payload);

  if (asymmetric) {
    const encodedHeader = base64UrlEncodeJson({ alg: 'ES256', typ: 'JWT', kid: asymmetric.kid });
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = await signEs256(signingInput, asymmetric.jwk);
    return `${signingInput}.${signature}`;
  }

  const jwtSecret = getEnv('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set. Add it via: supabase secrets set JWT_SECRET=<your-jwt-secret>');
  }

  const encodedHeader = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHs256(signingInput, jwtSecret);
  return `${signingInput}.${signature}`;
}

export interface VerifiedOwner {
  userId: string;
  name?: string;
}

/** Verifies HS256 (JWT_SECRET) or ES256/RS256 (JWKS by kid). Guests are rejected. */
export async function verifyOwnerToken(
  token: string,
  options?: VerifyOwnerOptions,
): Promise<VerifiedOwner | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(decoder.decode(base64UrlDecode(parts[0]))) as Record<string, unknown>;
    payload = JSON.parse(decoder.decode(base64UrlDecode(parts[1]))) as Record<string, unknown>;
  } catch {
    return null;
  }

  const signingInput = `${parts[0]}.${parts[1]}`;
  const alg = header.alg;

  if (alg === 'HS256') {
    const jwtSecret = getEnv('JWT_SECRET');
    if (!jwtSecret) return null;
    const expected = await signHs256(signingInput, jwtSecret);
    if (!timingSafeEqual(expected, parts[2])) return null;
    return ownerFromPayload(payload);
  }

  if (alg === 'ES256' || alg === 'RS256') {
    const kid = isNonEmptyString(header.kid) ? header.kid : '';
    if (!kid) return null;
    const jwk = await findJwksKey(kid, options?.loadJwks ?? defaultLoadJwks);
    if (!jwk) return null;
    const signature = base64UrlDecode(parts[2]);
    const ok = await verifyAsymmetric(alg, jwk, signingInput, signature);
    if (!ok) return null;
    return ownerFromPayload(payload);
  }

  return null;
}

export const bearerToken = (req: Request): string | null => {
  const header = req.headers.get('Authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};
