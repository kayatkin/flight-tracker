import {
  type AppJwtClaims,
  type PublicJwk,
  resetJwksCacheForTests,
  signAccessToken,
  verifyOwnerToken,
} from './jwt.ts';

const ownerClaims: AppJwtClaims = {
  sub: 'user-1',
  user_id: 'user-1',
  app_role: 'owner',
  name: 'Ada',
};

const guestClaims: AppJwtClaims = {
  sub: 'guest-1',
  user_id: 'owner-1',
  app_role: 'guest',
  permissions: 'view',
  share_session_id: 'sess-1',
};

function setEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    Deno.env.delete(name);
    return;
  }
  Deno.env.set(name, value);
}

function decodeJwtPart(part: string): Record<string, unknown> {
  const padded = part.replace(/-/g, '+').replace(/_/g, '/')
    + '='.repeat((4 - (part.length % 4)) % 4);
  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

type PrivateJwk = PublicJwk & { d?: string };

async function generateEs256Pair(kid: string): Promise<{ privateJwk: PrivateJwk; publicJwk: PublicJwk }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  if (!privateJwk.kty || !publicJwk.kty || !privateJwk.d || !publicJwk.x || !publicJwk.y) {
    throw new Error('generated JWK is missing fields');
  }
  return {
    privateJwk: {
      kty: privateJwk.kty,
      crv: privateJwk.crv,
      x: privateJwk.x,
      y: privateJwk.y,
      d: privateJwk.d,
      kid,
    },
    publicJwk: {
      kty: publicJwk.kty,
      crv: publicJwk.crv,
      x: publicJwk.x,
      y: publicJwk.y,
      kid,
      use: 'sig',
      alg: 'ES256',
    },
  };
}

Deno.test.beforeEach(() => {
  resetJwksCacheForTests();
  setEnv('JWT_SECRET', undefined);
  setEnv('JWT_SIGNING_PRIVATE_JWK', undefined);
  setEnv('JWT_SIGNING_KID', undefined);
  setEnv('SUPABASE_URL', undefined);
});

Deno.test('HS256 roundtrip verifies an owner token', async () => {
  setEnv('JWT_SECRET', 'test-hs256-secret');
  const token = await signAccessToken(ownerClaims);
  const header = decodeJwtPart(token.split('.')[0]);
  if (header.alg !== 'HS256') throw new Error(`expected HS256, got ${header.alg}`);
  const owner = await verifyOwnerToken(token);
  if (!owner || owner.userId !== 'user-1' || owner.name !== 'Ada') {
    throw new Error(`unexpected owner: ${JSON.stringify(owner)}`);
  }
});

Deno.test('HS256 guest tokens are rejected', async () => {
  setEnv('JWT_SECRET', 'test-hs256-secret');
  const token = await signAccessToken(guestClaims);
  const owner = await verifyOwnerToken(token);
  if (owner !== null) throw new Error('guest token must be rejected');
});

Deno.test('ES256 roundtrip verifies via JWKS kid and does not need JWT_SECRET', async () => {
  const { privateJwk, publicJwk } = await generateEs256Pair('kid-es256');
  setEnv('JWT_SIGNING_PRIVATE_JWK', JSON.stringify(privateJwk));
  const token = await signAccessToken(ownerClaims);
  const header = decodeJwtPart(token.split('.')[0]);
  if (header.alg !== 'ES256' || header.kid !== 'kid-es256') {
    throw new Error(`expected ES256 kid-es256, got ${JSON.stringify(header)}`);
  }
  const owner = await verifyOwnerToken(token, {
    loadJwks: () => Promise.resolve({ keys: [publicJwk] }),
  });
  if (!owner || owner.userId !== 'user-1') {
    throw new Error(`unexpected owner: ${JSON.stringify(owner)}`);
  }
});

Deno.test('JWT_SIGNING_KID overrides kid in the private JWK', async () => {
  const { privateJwk, publicJwk } = await generateEs256Pair('embedded-kid');
  setEnv('JWT_SIGNING_PRIVATE_JWK', JSON.stringify(privateJwk));
  setEnv('JWT_SIGNING_KID', 'override-kid');
  const token = await signAccessToken(ownerClaims);
  const header = decodeJwtPart(token.split('.')[0]);
  if (header.kid !== 'override-kid') throw new Error(`kid=${header.kid}`);
  const owner = await verifyOwnerToken(token, {
    loadJwks: () => Promise.resolve({ keys: [{ ...publicJwk, kid: 'override-kid' }] }),
  });
  if (!owner) throw new Error('override kid should verify');
});

Deno.test('malformed JWT_SIGNING_PRIVATE_JWK does not fall back to HS256', async () => {
  setEnv('JWT_SECRET', 'test-hs256-secret');
  setEnv('JWT_SIGNING_PRIVATE_JWK', '{not-json');
  let threw = false;
  try {
    await signAccessToken(ownerClaims);
  } catch (error) {
    threw = error instanceof Error && error.message.includes('not valid JSON');
  }
  if (!threw) throw new Error('expected malformed JWK to throw');
});

Deno.test('private JWK that is not ES256 P-256 throws', async () => {
  setEnv('JWT_SIGNING_PRIVATE_JWK', JSON.stringify({ kty: 'oct', k: 'abcd', kid: 'x' }));
  let threw = false;
  try {
    await signAccessToken(ownerClaims);
  } catch (error) {
    threw = error instanceof Error && error.message.includes('ES256');
  }
  if (!threw) throw new Error('expected non-EC JWK to throw');
});

Deno.test('ES256 tokens are not HMAC-verified even when JWT_SECRET is set', async () => {
  const { privateJwk } = await generateEs256Pair('kid-es256');
  setEnv('JWT_SECRET', 'test-hs256-secret');
  setEnv('JWT_SIGNING_PRIVATE_JWK', JSON.stringify(privateJwk));
  const token = await signAccessToken(ownerClaims);
  const owner = await verifyOwnerToken(token, {
    loadJwks: () => Promise.resolve({ keys: [] }),
  });
  if (owner !== null) throw new Error('ES256 must not verify via HMAC');
});

Deno.test('HS256 tokens still verify after an ES256 signing key is configured', async () => {
  setEnv('JWT_SECRET', 'test-hs256-secret');
  const hsToken = await signAccessToken(ownerClaims);
  const { privateJwk, publicJwk } = await generateEs256Pair('kid-es256');
  setEnv('JWT_SIGNING_PRIVATE_JWK', JSON.stringify(privateJwk));
  const esToken = await signAccessToken(ownerClaims);

  const hsOwner = await verifyOwnerToken(hsToken, {
    loadJwks: () => Promise.resolve({ keys: [publicJwk] }),
  });
  const esOwner = await verifyOwnerToken(esToken, {
    loadJwks: () => Promise.resolve({ keys: [publicJwk] }),
  });
  if (!hsOwner || !esOwner) throw new Error('dual-key verify should accept both algorithms');
});

Deno.test('ES256 without kid is rejected', async () => {
  const { privateJwk, publicJwk } = await generateEs256Pair('kid-es256');
  setEnv('JWT_SIGNING_PRIVATE_JWK', JSON.stringify(privateJwk));
  const token = await signAccessToken(ownerClaims);
  const [headerB64, payloadB64, sig] = token.split('.');
  const header = decodeJwtPart(headerB64);
  delete header.kid;
  const tamperedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const tampered = `${tamperedHeader}.${payloadB64}.${sig}`;
  const owner = await verifyOwnerToken(tampered, {
    loadJwks: () => Promise.resolve({ keys: [publicJwk] }),
  });
  if (owner !== null) throw new Error('ES256 without kid must be rejected');
});

Deno.test('unknown alg is rejected', async () => {
  setEnv('JWT_SECRET', 'test-hs256-secret');
  const token = await signAccessToken(ownerClaims);
  const [, payloadB64, sig] = token.split('.');
  const noneHeader = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const owner = await verifyOwnerToken(`${noneHeader}.${payloadB64}.${sig}`);
  if (owner !== null) throw new Error('alg none must be rejected');
});

Deno.test('RS256 tokens from JWKS verify without JWT_SECRET', async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey) as PublicJwk;
  publicJwk.kid = 'kid-rs256';
  const header = { alg: 'RS256', typ: 'JWT', kid: 'kid-rs256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    ...ownerClaims,
    ft: 'custom',
    aud: 'authenticated',
    exp: now + 60,
    iat: now,
    iss: 'supabase',
    role: 'authenticated',
  };
  const encode = (obj: unknown) => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    pair.privateKey,
    new TextEncoder().encode(signingInput),
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const token = `${signingInput}.${sigB64}`;
  const owner = await verifyOwnerToken(token, {
    loadJwks: () => Promise.resolve({ keys: [publicJwk] }),
  });
  if (!owner || owner.userId !== 'user-1') {
    throw new Error(`RS256 should verify, got ${JSON.stringify(owner)}`);
  }
});

Deno.test('JWKS refetch on unknown kid', async () => {
  const { privateJwk, publicJwk } = await generateEs256Pair('kid-es256');
  setEnv('JWT_SIGNING_PRIVATE_JWK', JSON.stringify(privateJwk));
  const token = await signAccessToken(ownerClaims);
  let calls = 0;
  const owner = await verifyOwnerToken(token, {
    loadJwks: () => {
      calls += 1;
      if (calls === 1) return Promise.resolve({ keys: [] });
      return Promise.resolve({ keys: [publicJwk] });
    },
  });
  if (!owner) throw new Error('should refetch JWKS when kid is missing');
  if (calls < 2) throw new Error(`expected refetch, calls=${calls}`);
});
