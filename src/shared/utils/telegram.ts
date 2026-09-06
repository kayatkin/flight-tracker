// src/utils/telegram.ts - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ
import { TelegramWebApp } from '../../shared/types/telegram.d';
import { applyTelegramTheme } from './theme';
import { generateShortId } from './id';
import { devLog, logError } from './logger';

let memoryDevUserId: string | null = null;

export const getTelegramWebApp = (): TelegramWebApp | null => {
  if (typeof window === 'undefined') return null;
  
  const webApp = window.Telegram?.WebApp;
  
  if (webApp) {
    devLog('[TELEGRAM] WebApp found:', {
      platform: webApp.platform,
      version: webApp.version,
      colorScheme: webApp.colorScheme,
      hasUser: !!webApp.initDataUnsafe?.user,
      themeParams: webApp.themeParams
    });
  }
  
  return webApp || null;
};

export const getTelegramUser = (): {id: string, first_name: string} | null => {
  const webApp = getTelegramWebApp();
  
  if (!webApp) {
    devLog('[TELEGRAM] No WebApp found');
    return null;
  }
  
  if (webApp.initDataUnsafe?.user) {
    const user = webApp.initDataUnsafe.user;
    devLog('[TELEGRAM] User found:', user);
    
    return {
      id: user.id.toString(),
      first_name: user.first_name || user.username || 'Пользователь'
    };
  }
  
  devLog('[TELEGRAM] No user data found');
  return null;
};

export const getDevelopmentUserId = (): string => {
  try {
    let devUserId = localStorage.getItem('flight_tracker_dev_user_id');

    if (!devUserId) {
      devUserId = 'dev_user_' + generateShortId(9);
      localStorage.setItem('flight_tracker_dev_user_id', devUserId);
      devLog('[DEVELOPMENT] Created new dev user_id:', devUserId);
    } else {
      devLog('[DEVELOPMENT] Using existing dev user_id:', devUserId);
    }

    return devUserId;
  } catch {
    memoryDevUserId ??= 'dev_user_' + generateShortId(9);
    return memoryDevUserId;
  }
};

export const initTelegramWebApp = (webApp: TelegramWebApp): void => {
  try {
    webApp.ready();
    webApp.expand();
    applyTelegramTheme(webApp);
    devLog('[TELEGRAM] WebApp initialized');
  } catch (error) {
    logError('[TELEGRAM] Failed to initialize:', error);
    // Не вызываем applyDefaultTheme здесь - это делает applyTelegramTheme
  }
};