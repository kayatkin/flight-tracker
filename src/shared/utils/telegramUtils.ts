/**
* Проверяет, открыто ли приложение внутри Telegram WebApp
 */
export const isInTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') return false;

  if (window.Telegram?.WebApp?.initData) {
    return true;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const tgWebAppStartParam = urlParams.get('tgWebAppStartParam');

  let hashStartParam = null;
  if (window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    hashStartParam = hashParams.get('tgWebAppStartParam');
  }

  return !!(tgWebAppStartParam || hashStartParam);
};

/**
 * Получает токен из Telegram WebApp параметров
 */
export const getTokenFromTelegramStartParamFixed = (): string | null => {
  if (typeof window === 'undefined') return null;

  const webApp = window.Telegram?.WebApp;

  if (webApp?.initDataUnsafe?.start_param) {
    return webApp.initDataUnsafe.start_param;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const startappParam = urlParams.get('tgWebAppStartParam') ?? urlParams.get('startapp');
  if (startappParam) {
    return startappParam;
  }

  const regularToken = urlParams.get('token');
  if (regularToken) {
    return regularToken;
  }

  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const hashToken = hashParams.get('token') ?? hashParams.get('startapp');
    if (hashToken) {
      return hashToken;
    }
  }

  return null;
};

/**
 * Проверяет, открыто ли приложение через прямое WebApp ссылку
 */
export const isInTelegramDirectWebApp = (): boolean => {
  const hasToken = !!getTokenFromTelegramStartParamFixed();
  const inTelegram = Boolean(window.Telegram?.WebApp?.initData);

  return hasToken && inTelegram;
};
