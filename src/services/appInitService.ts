// src/services/appInitService.ts
import { AppUser, GuestUser } from '../types/shared';
import { Flight } from '../types';
import { 
  getTelegramWebApp, 
  getTelegramUser, 
  getDevelopmentUserId, 
  initTelegramWebApp,
  applyDefaultTheme 
} from '../utils';
import { validateToken, loadUserData } from './dataService';

export interface AppInitResult {
  userName: string;
  userId: string;
  appUser: AppUser;
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
}

export interface GuestInitResult {
  guestUser: GuestUser;
  ownerData: {
    flights: Flight[];
    airlines: string[];
    originCities: string[];
    destinationCities: string[];
  };
}

// Функция для получения токена из URL
export const getTokenFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token');
};

// Функция для очистки токена из URL
export const clearTokenFromUrl = (): void => {
  window.history.replaceState({}, '', window.location.pathname);
};

// Функция для инициализации гостевого режима
export const initGuestMode = async (token: string): Promise<GuestInitResult | null> => {
  try {
    console.log('[INIT] Initializing guest mode with token:', token);
    const guestUser = await validateToken(token);
    
    if (!guestUser) {
      console.log('[INIT] Invalid token, clearing from URL');
      clearTokenFromUrl();
      return null;
    }
    
    const ownerData = await loadUserData(guestUser.ownerId);
    console.log('[INIT] Guest mode initialized successfully');
    
    return { guestUser, ownerData };
  } catch (error) {
    console.error('[INIT] Guest mode initialization failed:', error);
    clearTokenFromUrl();
    return null;
  }
};

// Функция для инициализации Telegram пользователя
export const initTelegramUser = (): {
  currentUserId: string;
  currentUserName: string;
  telegramDetected: boolean;
} => {
  const webApp = getTelegramWebApp();
  
  if (!webApp) {
    console.log('[INIT] No Telegram WebApp, using development mode');
    applyDefaultTheme();
    return {
      currentUserId: getDevelopmentUserId(),
      currentUserName: 'Разработчик',
      telegramDetected: false
    };
  }
  
  console.log('[INIT] Telegram WebApp detected!');
  initTelegramWebApp(webApp);
  
  const telegramUser = getTelegramUser();
  let currentUserId: string;
  let currentUserName: string;
  
  if (telegramUser) {
    currentUserId = 'tg_' + telegramUser.id;
    currentUserName = telegramUser.firstName;
    console.log('[INIT] Using Telegram user:', { 
      id: currentUserId, 
      name: currentUserName 
    });
  } else {
    currentUserId = 'telegram_anon_' + Math.random().toString(36).substr(2, 8);
    currentUserName = 'Аноним';
    console.log('[INIT] Using anonymous Telegram user:', currentUserId);
  }
  
  return {
    currentUserId,
    currentUserName,
    telegramDetected: true
  };
};

// Функция для создания объекта AppUser
export const createAppUser = (
  userId: string,
  userName: string,
  isGuest: boolean,
  isTelegram: boolean,
  guestData?: Partial<GuestUser>
): AppUser => {
  if (isGuest && guestData) {
    return {
      userId: guestData.userId || `guest_${Date.now()}`,
      name: guestData.name || 'Гость',
      isGuest: true,
      sessionToken: guestData.sessionToken || '',
      permissions: guestData.permissions || 'view',
      ownerId: guestData.ownerId || '',
      ownerName: guestData.ownerName || 'Владельца',
      telegramUser: guestData.telegramUser
    };
  }
  
  return {
    userId,
    name: userName,
    isGuest: false,
    isTelegram
  };
};

// Основная функция инициализации приложения
export const initializeApp = async (): Promise<AppInitResult> => {
  console.log('[INIT] Starting app initialization...');
  
  // Ждем немного для загрузки Telegram WebApp
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Проверяем токен в URL
  const token = getTokenFromUrl();
  
  if (token) {
    const guestResult = await initGuestMode(token);
    if (guestResult) {
      const { guestUser, ownerData } = guestResult;
      
      return {
        userName: `Гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`,
        userId: guestUser.ownerId,
        appUser: createAppUser(
          guestUser.ownerId,
          'Гость',
          true,
          false,
          guestUser
        ),
        flights: ownerData.flights,
        airlines: ownerData.airlines,
        originCities: ownerData.originCities,
        destinationCities: ownerData.destinationCities
      };
    }
  }
  
  // Инициализация для владельца
  const { currentUserId, currentUserName, telegramDetected } = initTelegramUser();
  const userData = await loadUserData(currentUserId);
  
  return {
    userName: currentUserName,
    userId: currentUserId,
    appUser: createAppUser(currentUserId, currentUserName, false, telegramDetected),
    flights: userData.flights,
    airlines: userData.airlines,
    originCities: userData.originCities,
    destinationCities: userData.destinationCities
  };
};

// Функция для обработки ошибок инициализации
export const getFallbackInitResult = (error: any): AppInitResult => {
  console.error('[CRITICAL] App initialization crashed:', error);
  applyDefaultTheme();
  
  return {
    userName: 'Гость',
    userId: 'error_user',
    appUser: {
      userId: 'error_user',
      name: 'Гость',
      isGuest: false,
      isTelegram: false
    },
    flights: [],
    airlines: [],
    originCities: [],
    destinationCities: []
  };
};