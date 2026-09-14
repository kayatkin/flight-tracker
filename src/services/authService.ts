import { t } from '@shared/i18n';
import { supabase } from '@shared/lib';
import { env } from '@shared/config/env';
import { getDevelopmentUserId } from '@shared/utils/telegram';
import { isRealTelegramUser } from '@shared/utils/telegramUserType';
import { GuestUser } from '@shared/types/shared';
import { devLog, logError } from '@shared/utils/logger';
import {
  authRedirectUrl,
  decodeJwtPayload,
  isCustomEdgeSession,
  isJwtExpired,
  mapAuthError,
  msUntilCustomRefresh,
  ownerFromCustomAccessToken,
  ownerFromGoTrueUser,
  ownerFromSession,
  validateEmailAuthForm,
} from './emailAuth';

export {
  AuthRequiredError,
  isAuthRequiredError,
  isCustomEdgeSession,
  mapAuthError,
  ownerFromCustomAccessToken,
  ownerFromGoTrueUser,
  ownerFromSession,
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

const stopGoTrueRefresh = (): void => {
  supabase.auth.stopAutoRefresh();
};

const startGoTrueRefresh = (): void => {
  supabase.auth.startAutoRefresh();
};

let customRefreshTimer: number | undefined;
let customRefreshBound = false;

const stopCustomRefreshTimer = (): void => {
  if (typeof window === 'undefined') return;
  if (customRefreshTimer !== undefined) {
    window.clearTimeout(customRefreshTimer);
    customRefreshTimer = undefined;
  }
};

export const refreshCustomSession = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  const access = data.session?.access_token;
  const refresh = data.session?.refresh_token;
  if (!access || !refresh || !isCustomEdgeSession(access, refresh)) return false;
  if (access === refresh) {
    return !isJwtExpired(access);
  }

  const { data: rotated, error } = await supabase.functions.invoke<{
    ok?: boolean;
    access_token?: string;
    refresh_token?: string;
  }>('auth-refresh', { body: { refresh_token: refresh } });

  if (error || !rotated?.access_token || !rotated?.refresh_token) {
    logError('[AUTH] auth-refresh failed:', error);
    return false;
  }

  await applySession(rotated.access_token, rotated.refresh_token);
  stopGoTrueRefresh();
  scheduleCustomRefresh();
  return true;
};

const scheduleCustomRefresh = (): void => {
  stopCustomRefreshTimer();
  if (typeof window === 'undefined') return;
  void supabase.auth.getSession().then(({ data }) => {
    const access = data.session?.access_token;
    const refresh = data.session?.refresh_token;
    if (!access || !refresh || !isCustomEdgeSession(access, refresh)) return;
    if (access === refresh) return;
    customRefreshTimer = window.setTimeout(() => {
      void refreshCustomSession();
    }, msUntilCustomRefresh(access));
  });
};

const onVisibilityRefresh = (): void => {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
  void supabase.auth.getSession().then(({ data }) => {
    const access = data.session?.access_token;
    const refresh = data.session?.refresh_token;
    if (!access || !refresh || !isCustomEdgeSession(access, refresh)) return;
    if (access === refresh) return;
    if (isJwtExpired(access, 90)) {
      void refreshCustomSession();
    }
  });
};

const unbindCustomRefresh = (): void => {
  stopCustomRefreshTimer();
  if (typeof document === 'undefined' || !customRefreshBound) return;
  document.removeEventListener('visibilitychange', onVisibilityRefresh);
  customRefreshBound = false;
};

export const startCustomRefreshTimer = (): void => {
  stopGoTrueRefresh();
  scheduleCustomRefresh();
  if (typeof document === 'undefined' || customRefreshBound) return;
  customRefreshBound = true;
  document.addEventListener('visibilitychange', onVisibilityRefresh);
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

const applyCustomSession = async (accessToken: string, refreshToken: string): Promise<void> => {
  await applySession(accessToken, refreshToken);
  startCustomRefreshTimer();
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

  await applyCustomSession(data.access_token, data.refresh_token ?? data.access_token);
  devLog(`[AUTH] ${functionName} session applied for`, data.userId);
  return data;
};

export const guestFromCustomAccessToken = (accessToken: string): GuestUser | null => {
  const claims = decodeJwtPayload(accessToken);
  if (!claims || claims.app_role !== 'guest') return null;
  const ownerId = String(claims.user_id ?? '');
  const sub = String(claims.sub ?? '');
  if (!ownerId || !sub) return null;
  const ownerName = typeof claims.name === 'string' && claims.name.trim()
    ? claims.name.trim()
    : t('guest.ownerFallback');
  return {
    userId: sub,
    name: t('guest.name'),
    isGuest: true,
    sessionToken: '',
    permissions: claims.permissions === 'edit' ? 'edit' : 'view',
    ownerId,
    ownerName,
  };
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
  name = t('auth.developer')
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

  await applyCustomSession(data.access_token, data.refresh_token ?? data.access_token);
  return data.guestUser;
};

const ensureFreshCustomAccess = async (access: string, refresh: string): Promise<string | null> => {
  if (!isJwtExpired(access)) return access;
  if (access === refresh) return null;
  const ok = await refreshCustomSession();
  if (!ok) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const restoreGuestSession = async (): Promise<GuestUser | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  const refresh = data.session.refresh_token;
  const access = data.session.access_token;
  if (!refresh || !access || !isCustomEdgeSession(access, refresh)) return null;

  const fresh = await ensureFreshCustomAccess(access, refresh);
  if (!fresh) return null;
  const guest = guestFromCustomAccessToken(fresh);
  if (!guest) return null;
  startCustomRefreshTimer();
  return guest;
};

export const restoreGoTrueOwner = async (): Promise<OwnerAuthResult | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;

  const refresh = data.session.refresh_token;
  const access = data.session.access_token;
  if (!refresh || !access) return null;

  if (isCustomEdgeSession(access, refresh)) {
    if (guestFromCustomAccessToken(access)) return null;
    const fresh = await ensureFreshCustomAccess(access, refresh);
    if (!fresh) return null;
    const owner = ownerFromCustomAccessToken(fresh);
    if (!owner) return null;
    startCustomRefreshTimer();
    await ensurePublicUser(owner.userId, owner.userName);
    return owner;
  }

  const owner = ownerFromSession(data.session);
  if (!owner) return null;
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
  const owner = ownerFromSession({
    access_token: data.session?.access_token,
    user: data.user,
  }) ?? ownerFromGoTrueUser(data.user);
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
  const owner = ownerFromSession({
    access_token: data.session.access_token,
    user: data.user,
  }) ?? ownerFromGoTrueUser(data.user);
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
    return { ok: false, error: t('auth.shortPassword') };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }
  return { ok: true };
};

export const signOutOwner = async (): Promise<void> => {
  const { data } = await supabase.auth.getSession();
  const access = data.session?.access_token;
  const refresh = data.session?.refresh_token;
  if (access && refresh && isCustomEdgeSession(access, refresh) && access !== refresh) {
    await supabase.functions.invoke('auth-refresh', {
      body: { refresh_token: refresh, revoke: true },
    });
  }
  unbindCustomRefresh();
  await supabase.auth.signOut();
};

export const signInAsDeveloper = async (): Promise<OwnerAuthResult | null> => {
  return authenticateDev(getDevelopmentUserId(), t('auth.developer'));
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

  return null;
};
