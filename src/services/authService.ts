import { supabase } from '@shared/lib';
import { env } from '@shared/config/env';
import { getDevelopmentUserId } from '@shared/utils/telegram';
import { isRealTelegramUser } from '@shared/utils/telegramUserType';
import { GuestUser } from '@shared/types/shared';
import { devLog, logError } from '@shared/utils/logger';
import {
  authRedirectUrl,
  mapAuthError,
  ownerFromCustomAccessToken,
  ownerFromGoTrueUser,
  validateEmailAuthForm,
} from './emailAuth';

export {
  AuthRequiredError,
  isAuthRequiredError,
  mapAuthError,
  ownerFromCustomAccessToken,
  ownerFromGoTrueUser,
  validateEmailAuthForm,
} from './emailAuth';

interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  userId: string;
  name: string;
  guestUser?: GuestUser;
}

export interface OwnerAuthResult {
  userId: string;
  userName: string;
}

export interface EmailAuthResult {
  ok: boolean;
  needsConfirmation?: boolean;
  error?: string;
}

const stopCustomJwtRefresh = (): void => {
  supabase.auth.stopAutoRefresh();
};

const startGoTrueRefresh = (): void => {
  supabase.auth.startAutoRefresh();
};

const applySession = async (accessToken: string, refreshToken: string): Promise<void> => {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw error;
  }
};

const ensurePublicUser = async (userId: string, name: string): Promise<void> => {
  const { error } = await supabase.from('users').upsert(
    {
      user_id: userId,
      name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    logError('[AUTH] Failed to upsert public user', error);
  }
};

const invokeAuth = async <T extends AuthTokensResponse>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T | null> => {
  const { data, error } = await supabase.functions.invoke<T>(functionName, { body });

  if (error) {
    logError(`[AUTH] ${functionName} invoke error:`, error);
    return null;
  }

  if (!data?.access_token) {
    logError(`[AUTH] ${functionName} missing access_token`);
    return null;
  }

  await applySession(data.access_token, data.refresh_token ?? data.access_token);
  stopCustomJwtRefresh();
  devLog(`[AUTH] ${functionName} session applied for`, data.userId);
  return data;
};

/** Telegram Mini App — validates initData server-side and issues JWT. */
export const authenticateTelegram = async (initData: string): Promise<OwnerAuthResult | null> => {
  const data = await invokeAuth<AuthTokensResponse>('auth-telegram', { initData });
  if (!data) return null;
  return { userId: data.userId, userName: data.name };
};

/** Browser dev mode — only when ALLOW_DEV_AUTH=true on Supabase. */
export const authenticateDev = async (
  userId: string,
  name = 'Разработчик'
): Promise<OwnerAuthResult | null> => {
  if (!env.isDev) {
    logError('[AUTH] Dev auth is only available in development builds');
    return null;
  }

  const data = await invokeAuth<AuthTokensResponse>('auth-dev', { userId, name });
  if (!data) return null;
  return { userId: data.userId, userName: data.name };
};

/** Share link — issues guest JWT scoped to owner data. */
export const authenticateGuest = async (shareToken: string): Promise<GuestUser | null> => {
  const initData =
    typeof window !== 'undefined' && isRealTelegramUser()
      ? window.Telegram?.WebApp?.initData ?? ''
      : '';

  const { data, error } = await supabase.functions.invoke<AuthTokensResponse>('auth-guest', {
    body: { token: shareToken, initData },
  });

  if (error || !data?.access_token || !data.guestUser) {
    logError('[AUTH] auth-guest failed:', error);
    return null;
  }

  await applySession(data.access_token, data.refresh_token ?? data.access_token);
  stopCustomJwtRefresh();
  return data.guestUser;
};

export const restoreGoTrueOwner = async (): Promise<OwnerAuthResult | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;

  const refresh = data.session.refresh_token;
  const access = data.session.access_token;
  if (!refresh || !access) return null;

  if (refresh === access) {
    const owner = ownerFromCustomAccessToken(access);
    if (!owner) return null;
    stopCustomJwtRefresh();
    await ensurePublicUser(owner.userId, owner.userName);
    return owner;
  }

  if (!data.session.user) return null;
  const owner = ownerFromGoTrueUser(data.session.user);
  startGoTrueRefresh();
  await ensurePublicUser(owner.userId, owner.userName);
  return owner;
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<EmailAuthResult> => {
  const invalid = validateEmailAuthForm({ email, password, mode: 'login' });
  if (invalid) return { ok: false, error: invalid };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.user) {
    return { ok: false, error: mapAuthError(error?.message) };
  }
  const owner = ownerFromGoTrueUser(data.user);
  startGoTrueRefresh();
  await ensurePublicUser(owner.userId, owner.userName);
  return { ok: true };
};

export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<EmailAuthResult> => {
  const invalid = validateEmailAuthForm({ email, password, mode: 'register' });
  if (invalid) return { ok: false, error: invalid };

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: authRedirectUrl(),
      data: { name: email.trim().split('@')[0] },
    },
  });
  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }
  if (!data.session || !data.user) {
    return { ok: true, needsConfirmation: true };
  }
  const owner = ownerFromGoTrueUser(data.user);
  startGoTrueRefresh();
  await ensurePublicUser(owner.userId, owner.userName);
  return { ok: true };
};

export const requestPasswordReset = async (email: string): Promise<EmailAuthResult> => {
  const invalid = validateEmailAuthForm({ email, password: 'unused1', mode: 'forgot' });
  if (invalid) return { ok: false, error: invalid };

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirectUrl(),
  });
  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }
  return { ok: true };
};

export const updatePassword = async (password: string): Promise<EmailAuthResult> => {
  if (password.length < 6) {
    return { ok: false, error: 'Пароль не короче 6 символов' };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }
  return { ok: true };
};

export const signOutOwner = async (): Promise<void> => {
  await supabase.auth.signOut();
};

export const signInAsDeveloper = async (): Promise<OwnerAuthResult | null> => {
  return authenticateDev(getDevelopmentUserId(), 'Разработчик');
};

/** Picks Telegram → saved email/dev owner session. Dev auth is opt-in from the login screen. */
export const authenticateOwner = async (): Promise<OwnerAuthResult | null> => {
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';

  if (initData && isRealTelegramUser()) {
    const tg = await authenticateTelegram(initData);
    if (tg) return tg;
  }

  const restored = await restoreGoTrueOwner();
  if (restored) return restored;

  const { data } = await supabase.auth.getSession();
  const access = data.session?.access_token;
  const refresh = data.session?.refresh_token;
  if (access && refresh === access) {
    await supabase.auth.signOut();
  }

  return null;
};
