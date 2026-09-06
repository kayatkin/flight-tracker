const TOKEN_LIKE = /^[a-zA-Z0-9_-]{10,}$/;

const stripSharePrefix = (value: string): string =>
  decodeURIComponent(value).replace(/^share_/, '');

const tokenFromSearchParams = (params: URLSearchParams): string | null => {
  const raw =
    params.get('token') ??
    params.get('startapp') ??
    params.get('tgWebAppStartParam') ??
    params.get('start');

  if (!raw) return null;
  const token = stripSharePrefix(raw.trim());
  return token ? token : null;
};

/**
 * Extracts a share token from a raw token, web `?token=` URL,
 * Telegram `?startapp=` / `?start=share_` link, or hash params.
 */
export const extractShareToken = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const fromQuery = tokenFromSearchParams(url.searchParams);
    if (fromQuery) return fromQuery;

    if (url.hash) {
      const fromHash = tokenFromSearchParams(new URLSearchParams(url.hash.replace(/^#/, '')));
      if (fromHash) return fromHash;
    }
  } catch {
    // Not a full URL — try protocol-less t.me links and query fragments.
  }

  const patterns = [
    /[?&]token=([^&\s#]+)/i,
    /[?&#]startapp=([^&\s#]+)/i,
    /[?&]tgWebAppStartParam=([^&\s#]+)/i,
    /[?&]start=share_([^&\s#]+)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return stripSharePrefix(match[1]);
    }
  }

  if (TOKEN_LIKE.test(trimmed)) {
    return stripSharePrefix(trimmed);
  }

  return null;
};
