import { t } from '@shared/i18n';

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export const isAuthRequiredError = (error: unknown): boolean =>
  error instanceof AuthRequiredError
  || (error instanceof Error && error.name === 'AuthRequiredError');

export const authRedirectUrl = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const url = `${window.location.origin}${window.location.pathname}`;
  return url.endsWith('/') ? url : `${url}/`;
};

export type AuthCallbackParams = {
  type?: string;
  token_hash?: string;
  access_token?: string;
  refresh_token?: string;
  code?: string;
  error?: string;
  error_description?: string;
};

export const parseAuthCallbackParams = (href?: string): AuthCallbackParams => {
  const raw = href ?? (typeof window !== 'undefined' ? window.location.href : '');
  if (!raw) return {};
  try {
    const url = new URL(raw);
    const hash = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
    const pick = (key: string): string | undefined =>
      url.searchParams.get(key) || hash.get(key) || undefined;
    return {
      type: pick('type'),
      token_hash: pick('token_hash'),
      access_token: pick('access_token'),
      refresh_token: pick('refresh_token'),
      code: pick('code'),
      error: pick('error'),
      error_description: pick('error_description'),
    };
  } catch {
    return {};
  }
};

export const isRecoveryCallback = (params: AuthCallbackParams): boolean =>
  params.type === 'recovery';

export const AUTH_CALLBACK_KEYS = [
  'code',
  'type',
  'token_hash',
  'access_token',
  'refresh_token',
  'expires_in',
  'expires_at',
  'token_type',
  'error',
  'error_description',
  'error_code',
] as const;

export const stripAuthCallbackFromUrl = (): void => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const key of AUTH_CALLBACK_KEYS) {
    url.searchParams.delete(key);
  }
  url.hash = '';
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, '', next);
};

export const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const ownerFromGoTrueUser = (user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): { userId: string; userName: string } => {
  const metaName = typeof user.user_metadata?.name === 'string'
    ? user.user_metadata.name.trim()
    : '';
  const emailName = user.email?.split('@')[0]?.trim() ?? '';
  return {
    userId: user.id,
    userName: metaName || emailName || t('auth.ownerFallback'),
  };
};

export const isJwtExpired = (accessToken: string, skewSeconds = 30): boolean => {
  const claims = decodeJwtPayload(accessToken);
  const exp = typeof claims?.exp === 'number' ? claims.exp : 0;
  if (!exp) return false;
  return exp < Math.floor(Date.now() / 1000) + skewSeconds;
};

/** Custom Edge JWT (Telegram / guest / auth-dev), not a GoTrue email session. */
export const isCustomEdgeSession = (accessToken: string, refreshToken: string): boolean => {
  const claims = decodeJwtPayload(accessToken);
  if (!claims) return false;
  if (claims.ft === 'custom') return true;
  return accessToken === refreshToken
    && (claims.app_role === 'owner' || claims.app_role === 'guest');
};

/** Seconds until we should rotate a custom access token (1 minute before exp). */
export const msUntilCustomRefresh = (accessToken: string, leadMs = 60_000): number => {
  const claims = decodeJwtPayload(accessToken);
  const exp = typeof claims?.exp === 'number' ? claims.exp : 0;
  if (!exp) return 60_000;
  return Math.max(5_000, exp * 1000 - Date.now() - leadMs);
};

export const ownerFromCustomAccessToken = (accessToken: string): {
  userId: string;
  userName: string;
} | null => {
  const claims = decodeJwtPayload(accessToken);
  if (!claims || claims.app_role !== 'owner') return null;
  const userId = String(claims.user_id ?? claims.sub ?? '');
  if (!userId) return null;
  const name = typeof claims.name === 'string' ? claims.name.trim() : '';
  return { userId, userName: name || t('auth.ownerFallback') };
};

export const ownerFromSession = (session: {
  access_token?: string | null;
  user?: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  } | null;
}): { userId: string; userName: string } | null => {
  if (session.access_token) {
    const fromToken = ownerFromCustomAccessToken(session.access_token);
    if (fromToken) return fromToken;
  }
  if (!session.user) return null;
  return ownerFromGoTrueUser(session.user);
};

export const mapAuthError = (message: string | undefined): string => {
  const text = (message ?? '').toLowerCase();
  if (!text) return t('errors.generic');
  if (text.includes('invalid login') || text.includes('invalid credentials')) {
    return t('errors.invalidCredentials');
  }
  if (text.includes('email not confirmed')) {
    return t('errors.emailNotConfirmed');
  }
  if (text.includes('already registered') || text.includes('already been registered')) {
    return t('errors.alreadyRegistered');
  }
  if (text.includes('password should be') || text.includes('password is known')) {
    return t('errors.passwordTooShort');
  }
  if (text.includes('rate limit') || text.includes('too many requests')) {
    return t('errors.rateLimit');
  }
  if (text.includes('user not found')) {
    return t('errors.userNotFound');
  }
  if (text.includes('pkce') || text.includes('code verifier')) {
    return t('errors.pkce');
  }
  if (text.includes('expired') || text.includes('otp_expired') || text.includes('invalid token')) {
    return t('errors.expired');
  }
  return t('errors.generic');
};

export const validateEmailAuthForm = (params: {
  email: string;
  password: string;
  mode: 'login' | 'register' | 'forgot';
}): string | null => {
  const email = params.email.trim();
  if (!email || !email.includes('@')) {
    return t('auth.invalidEmail');
  }
  if (params.mode === 'forgot') return null;
  if (params.password.length < 6) {
    return t('auth.shortPassword');
  }
  return null;
};
