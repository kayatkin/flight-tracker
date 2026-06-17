const encoder = new TextEncoder();
const TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 60 * 60 * 24;
const TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS = 60 * 5;

async function importHmacKey(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function getTelegramSecretKey(botToken: string): Promise<CryptoKey> {
  const webAppKey = await importHmacKey(encoder.encode('WebAppData'));
  const secretBuffer = await crypto.subtle.sign('HMAC', webAppKey, encoder.encode(botToken));
  return importHmacKey(secretBuffer);
}

/** @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
export async function validateTelegramInitData(
  initData: string,
  botToken: string
): Promise<boolean> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;

  const authDate = Number(params.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isFinite(authDate) ||
    authDate <= 0 ||
    authDate > now + TELEGRAM_INIT_DATA_FUTURE_SKEW_SECONDS ||
    now - authDate > TELEGRAM_INIT_DATA_MAX_AGE_SECONDS
  ) {
    return false;
  }

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

  return calculated === hash;
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
    return JSON.parse(raw) as TelegramWebAppUser;
  } catch {
    return null;
  }
}
