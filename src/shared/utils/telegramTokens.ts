/**
 * Мостовая функция для безопасного перехода на новую логику
 * Использует новую функцию, но с именем старой для обратной совместимости
 */

import { getTokenFromTelegramStartParamFixed } from '../../utils/telegramUtils';

// Для обратной совместимости - временный мост
export const getTokenFromTelegramStartParam = (): string | null => {
  console.log('[TELEGRAM BRIDGE] Using fixed token extraction');
  return getTokenFromTelegramStartParamFixed();
};

// Новая универсальная функция (можно использовать напрямую)
export const getTokenFromAnywhere = (): string | null => {
  return getTokenFromTelegramStartParamFixed();
};

// Функция для очистки токена из URL
export const clearTokenFromUrl = (): void => {
  try {
    // Удаляем и query параметры, и hash
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
    console.log('[URL] Token cleared from URL');
  } catch (error) {
    console.error('[URL] Error clearing token:', error);
  }
};