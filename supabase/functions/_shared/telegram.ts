const encoder = new TextEncoder();
const INIT_DATA_MAX_AGE_SECONDS = 60 * 60 * 24;

async function importHmacKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function getTelegramSecretKey(botToken: string): Promise<CryptoKey> {
  const webAppKey = await importHmacKey(encoder.encode('WebAppData'));
  const secretBuffer = await crypto.subtle.sign('HMAC', webAppKey, encoder.encode(botToken));
  return importHmacKey(secretBuffer);
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

function isFreshAuthDate(authDateRaw: string | null, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!authDateRaw) return false;
  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate) || authDate <= 0) return false;
  if (authDate > nowSeconds + 60) return false;
  return nowSeconds - authDate <= INIT_DATA_MAX_AGE_SECONDS;
}

/** @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
export async function validateTelegramInitData(
  initData: string,
  botToken: string
): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return false;
  if (!isFreshAuthDate(params.get('auth_date'))) return false;

  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = await getTelegramSecretKey(botToken);
  const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
  const calculated = [...new Uint8Array(signature)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(calculated.toLowerCase(), hash.toLowerCase());
}

export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  username?: string;
}

export function parseTelegramUser(initData: string): TelegramWebAppUser | null {
  const raw = new URLSearchParams(initData).get('user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { id?: unknown; first_name?: unknown; username?: unknown };
    const id = Number(parsed.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return {
      id,
      first_name: typeof parsed.first_name === 'string' ? parsed.first_name : undefined,
      username: typeof parsed.username === 'string' ? parsed.username : undefined,
    };
  } catch {
    return null;
  }
}
