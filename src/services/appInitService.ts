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
// Обновляем импорт для безсерверной версии
import { 
  isInTelegramWebApp, 
  redirectToTelegramForEdit,
  getTokenFromTelegramStartParam,
  isInTelegramDirectWebApp 
} from '../utils/telegramUtils';
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

// ==================== ДОБАВЬТЕ ЭТО ====================
let isInitializing = false;
let initializationPromise: Promise<AppInitResult> | null = null;
// ==================== ДОБАВЬТЕ ЭТО ====================

// Функция для получения токена из URL (обновленная)
export const getTokenFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // ========== КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ==========
  // Сначала проверяем Telegram WebApp параметры
  const telegramToken = getTokenFromTelegramStartParam();
  if (telegramToken) {
    console.log('[INIT] Found token from Telegram WebApp params:', telegramToken);
    return telegramToken;
  }
  
  // Затем проверяем обычный токен в URL
  const regularToken = urlParams.get('token');
  if (regularToken) {
    console.log('[INIT] Found regular token from URL:', regularToken);
    return regularToken;
  }
  
  return null;
  // ========== КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ==========
};

// Функция для очистки токена из URL (обновленная)
export const clearTokenFromUrl = (): void => {
  // Сохраняем hash часть если есть (для Telegram WebApp параметров)
  const hash = window.location.hash;
  
  // Очищаем только query параметры, сохраняем hash
  window.history.replaceState({}, '', window.location.pathname + hash);
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
    
    // ========== ОБНОВЛЕННАЯ ПРОВЕРКА ==========
    // Проверка: если права на редактирование, но не в Telegram WebApp
    if (guestUser.permissions === 'edit') {
      const inTelegramWebApp = isInTelegramWebApp() || isInTelegramDirectWebApp();
      
      if (!inTelegramWebApp) {
        console.log('[INIT] Edit permission detected, redirecting to Telegram WebApp');
        console.log('[INIT] Bot does not need to be running for this link!');
        
        // Редиректим в Telegram (безсерверная версия)
        redirectToTelegramForEdit(token);
        
        // Очищаем токен из URL чтобы избежать цикла
        clearTokenFromUrl();
        
        // Возвращаем null, чтобы прервать инициализацию
        return null;
      } else {
        console.log('[INIT] Edit permission in Telegram WebApp - allowing access');
      }
    }
    // ========== ОБНОВЛЕННАЯ ПРОВЕРКА ==========
    
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

// Основная функция инициализации приложения (обновленная)
export const initializeApp = async (): Promise<AppInitResult> => {
  // ==================== ДОБАВЬТЕ ЭТО ====================
  // Защита от повторной инициализации
  if (isInitializing && initializationPromise) {
    console.log('[INIT] Already initializing, returning existing promise');
    return initializationPromise;
  }
  
  isInitializing = true;
  // ==================== ДОБАВЬТЕ ЭТО ====================
  
  console.log('[INIT] Starting app initialization...');
  console.log('[INIT] Serverless bot mode: Telegram links work without running bot');
  
  // ==================== ДОБАВЬТЕ ЭТО ====================
  // Создаем промис один раз
  initializationPromise = (async () => {
  // ==================== ДОБАВЬТЕ ЭТО ====================
  
    // Ждем немного для загрузки Telegram WebApp
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Проверяем токен в URL (обновленная функция)
    const token = getTokenFromUrl();
    
    if (token) {
      const guestResult = await initGuestMode(token);
      if (guestResult) {
        const { guestUser, ownerData } = guestResult;
        
        // ========== ОПРЕДЕЛЯЕМ ТИП ДОСТУПА ==========
        const isTelegramAccess = isInTelegramWebApp() || isInTelegramDirectWebApp();
        const isEditPermission = guestUser.permissions === 'edit';
        
        console.log('[INIT] Guest access type:', {
          isTelegram: isTelegramAccess,
          isEdit: isEditPermission,
          tokenSource: getTokenFromTelegramStartParam() ? 'Telegram WebApp' : 'Regular URL'
        });
        // ========== ОПРЕДЕЛЯЕМ ТИП ДОСТУПА ==========
        
        // ==================== ДОБАВЬТЕ ЭТО ====================
        isInitializing = false;
        // ==================== ДОБАВЬТЕ ЭТО ====================
        
        return {
          userName: `Гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`,
          userId: guestUser.ownerId,
          appUser: createAppUser(
            guestUser.ownerId,
            'Гость',
            true,
            isTelegramAccess, // Используем реальное значение
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
    
    // ==================== ДОБАВЬТЕ ЭТО ====================
    isInitializing = false;
    // ==================== ДОБАВЬТЕ ЭТО ====================
    
    return {
      userName: currentUserName,
      userId: currentUserId,
      appUser: createAppUser(currentUserId, currentUserName, false, telegramDetected),
      flights: userData.flights,
      airlines: userData.airlines,
      originCities: userData.originCities,
      destinationCities: userData.destinationCities
    };
    
  // ==================== ДОБАВЬТЕ ЭТО ====================
  })();
  
  return initializationPromise;
  // ==================== ДОБАВЬТЕ ЭТО ====================
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

// ==================== ДОБАВЬТЕ ЭТО ====================
// Функция для сброса состояния инициализации (для тестов)
export const resetInitialization = (): void => {
  isInitializing = false;
  initializationPromise = null;
};

// Новая функция для отладки
export const debugInitialization = (): void => {
  console.log('[INIT DEBUG] Current state:', {
    isInitializing,
    hasToken: !!getTokenFromUrl(),
    inTelegramWebApp: isInTelegramWebApp(),
    inTelegramDirectWebApp: isInTelegramDirectWebApp(),
    tokenFromTelegram: getTokenFromTelegramStartParam(),
    url: window.location.href,
    searchParams: window.location.search,
    hash: window.location.hash
  });
};
// ==================== ДОБАВЬТЕ ЭТО ====================