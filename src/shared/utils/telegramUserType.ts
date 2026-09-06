export type TelegramUserType = 'real_telegram' | 'anonymous_telegram' | 'web_browser';

const hasTelegramLaunchData = (webApp: NonNullable<Window['Telegram']>['WebApp']): boolean => {
  if (webApp.initData?.trim()) {
    return true;
  }

  const platform = webApp.platform;
  return Boolean(platform && platform !== 'unknown' && platform !== 'web');
};

/** Detects how the app is opened: real TG user, anonymous WebApp, or plain browser. */
export const getTelegramUserType = (): TelegramUserType => {
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  if (!webApp || !hasTelegramLaunchData(webApp)) {
    return 'web_browser';
  }

  const user = webApp.initDataUnsafe?.user;
  if (user?.id) {
    return 'real_telegram';
  }

  return 'anonymous_telegram';
};

export const isRealTelegramUser = (): boolean => getTelegramUserType() === 'real_telegram';
