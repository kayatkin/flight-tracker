import { supabase } from '@lib/supabaseClient';
import { env } from '@shared/config/env';
import { getDevelopmentUserId } from '@shared/utils/telegram';
import { isRealTelegramUser } from '@shared/utils/telegramUserType';
import { GuestUser } from '@shared/types/shared';
import { devLog, logError } from '@shared/utils/logger';

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

const applySession = async (accessToken: string, refreshToken: string): Promise<void> => {
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw error;
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
  return data.guestUser;
};

/** Picks Telegram → dev auth for owner sessions. */
export const authenticateOwner = async (): Promise<OwnerAuthResult | null> => {
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';

  if (initData && isRealTelegramUser()) {
    const tg = await authenticateTelegram(initData);
    if (tg) return tg;
  }

  if (env.isDev) {
    return authenticateDev(getDevelopmentUserId(), 'Разработчик');
  }

  return null;
};

export const signOutAuth = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    throw error;
  }
};
