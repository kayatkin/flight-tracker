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
  return `${window.location.origin}${window.location.pathname}`;
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
    userName: metaName || emailName || 'Владелец',
  };
};

/** Custom Edge Function JWT (Telegram / auth-dev): refresh_token === access_token. */
export const ownerFromCustomAccessToken = (accessToken: string): {
  userId: string;
  userName: string;
} | null => {
  const claims = decodeJwtPayload(accessToken);
  if (!claims || claims.app_role !== 'owner') return null;
  const userId = String(claims.user_id ?? claims.sub ?? '');
  if (!userId) return null;
  const name = typeof claims.name === 'string' ? claims.name.trim() : '';
  return { userId, userName: name || 'Владелец' };
};

export const mapAuthError = (message: string | undefined): string => {
  const text = (message ?? '').toLowerCase();
  if (!text) return 'Не удалось войти. Попробуйте ещё раз.';
  if (text.includes('invalid login') || text.includes('invalid credentials')) {
    return 'Неверный email или пароль';
  }
  if (text.includes('email not confirmed')) {
    return 'Подтвердите email по ссылке из письма';
  }
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'Этот email уже зарегистрирован. Войдите или сбросьте пароль.';
  }
  if (text.includes('password should be') || text.includes('password is known')) {
    return 'Пароль слишком короткий. Минимум 6 символов.';
  }
  if (text.includes('rate limit') || text.includes('too many requests')) {
    return 'Слишком много попыток. Подождите минуту.';
  }
  if (text.includes('user not found')) {
    return 'Аккаунт с таким email не найден';
  }
  return 'Не удалось войти. Попробуйте ещё раз.';
};

export const validateEmailAuthForm = (params: {
  email: string;
  password: string;
  mode: 'login' | 'register' | 'forgot';
}): string | null => {
  const email = params.email.trim();
  if (!email || !email.includes('@')) {
    return 'Укажите действующий email';
  }
  if (params.mode === 'forgot') return null;
  if (params.password.length < 6) {
    return 'Пароль не короче 6 символов';
  }
  return null;
};
