/**
 * Cryptographically secure ID helpers (prefer crypto API over Math.random).
 */

const getRandomValues = (buffer: Uint8Array): Uint8Array => {
  if (globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(buffer);
  }
  // Weak fallback for test environments without Web Crypto (not used in production browsers)
  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer;
};

export const generateUUID = (): string => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** URL-safe token for shared session links (32 hex chars). */
export const generateShareToken = (): string => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random generator is required to create share tokens');
  }
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

/** Short random suffix for guest / anon user ids. */
export const generateShortId = (length = 8): string => {
  const bytes = new Uint8Array(Math.ceil(length * 0.75));
  getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36))
    .join('')
    .slice(0, length);
};

export const isValidUUID = (uuid: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
