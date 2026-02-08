/**
 * Проверяет, открыто ли приложение внутри Telegram WebApp
 */
export const isInTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Способ 1: Стандартная проверка через Telegram WebApp SDK
  if (window.Telegram?.WebApp?.initData) {
    return true;
  }
  
  // Способ 2: Проверка параметров URL для прямого открытия WebApp
  const urlParams = new URLSearchParams(window.location.search);
  const tgWebAppStartParam = urlParams.get('tgWebAppStartParam');
  
  // Способ 3: Проверка hash параметров
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
  
  // 1. start_param (для ?start=...)
  if (webApp?.initDataUnsafe?.start_param) {
    const token = webApp.initDataUnsafe.start_param;
    console.log('[TOKEN] Found in start_param:', token);
    return token;
  }

  // 2. tgWebAppStartParam (для ?startapp=...)
  const urlParams = new URLSearchParams(window.location.search);
  const startappParam = urlParams.get('tgWebAppStartParam');
  if (startappParam) {
    console.log('[TOKEN] Found in tgWebAppStartParam:', startappParam);
    return startappParam;
  }

  // 3. Обычный ?token= (для веба)
  const regularToken = urlParams.get('token');
  if (regularToken) {
    console.log('[TOKEN] Found in ?token=', regularToken);
    return regularToken;
  }

  // 4. Hash fallback
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const hashToken = hashParams.get('token');
    if (hashToken) {
      console.log('[TOKEN] Found in hash:', hashToken);
      return hashToken;
    }
  }

  console.log('[TOKEN] No token found in any location');
  return null;
};

/**
 * Проверяет, открыто ли приложение через прямое WebApp ссылку
 */
export const isInTelegramDirectWebApp = (): boolean => {
  const hasToken = !!getTokenFromTelegramStartParamFixed();
  const inTelegram = !!window.Telegram?.WebApp;
  
  return hasToken && inTelegram;
};