// src/utils/telegram.ts - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
import { TelegramWebApp } from '../../shared/types/telegram.d'; // ✅ Прямой импорт
import { applyTelegramTheme } from './theme';

export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window === 'undefined') return null;
  
  const webApp = window.Telegram?.WebApp;
  
  if (webApp) {
    console.log('[TELEGRAM] WebApp found:', {
      platform: webApp.platform,
      version: webApp.version,
      colorScheme: webApp.colorScheme,
      hasUser: !!webApp.initDataUnsafe?.user,
      themeParams: webApp.themeParams
    });
  }
  
  return webApp || null;
};

export const getTelegramUser = (): {id: string, firstName: string} | null => {
  const webApp = getTelegramWebApp();
  
  if (!webApp) {
    console.log('[TELEGRAM] No WebApp found');
    return null;
  }
  
  if (webApp.initDataUnsafe?.user) {
    const user = webApp.initDataUnsafe.user;
    console.log('[TELEGRAM] User found:', user);
    
    return {
      id: user.id.toString(),
      firstName: user.first_name || user.username || 'Пользователь'
    };
  }
  
  console.log('[TELEGRAM] No user data found');
  return null;
};

export const getDevelopmentUserId = (): string => {
  let devUserId = localStorage.getItem('flight_tracker_dev_user_id');
  
  if (!devUserId) {
    devUserId = 'dev_user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('flight_tracker_dev_user_id', devUserId);
    console.log('[DEVELOPMENT] Created new dev user_id:', devUserId);
  } else {
    console.log('[DEVELOPMENT] Using existing dev user_id:', devUserId);
  }
  
  return devUserId;
};

export const initTelegramWebApp = (webApp: TelegramWebApp): void => {
  try {
    webApp.ready();
    webApp.expand();
    applyTelegramTheme(webApp);
    console.log('[TELEGRAM] WebApp initialized');
  } catch (error) {
    console.error('[TELEGRAM] Failed to initialize:', error);
    // Не вызываем applyDefaultTheme здесь - это делает applyTelegramTheme
  }
};