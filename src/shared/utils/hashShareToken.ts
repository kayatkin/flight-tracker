const encoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');

export const hashShareToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return toHex(digest);
};
