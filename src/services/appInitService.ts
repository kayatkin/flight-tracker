// src/services/appInitService.ts
import { AppUser, GuestUser, OwnerUser } from '../types/shared';
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
  isInTelegramDirectWebApp 
} from '../utils/telegramUtils';
// Импортируем только getTokenFromTelegramStartParam
import { 
  getTokenFromTelegramStartParam 
} from '../shared/utils/telegramTokens';
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

// ==================== ЗАЩИТА ОТ ПОВТОРНОЙ ИНИЦИАЛИЗАЦИИ ====================
let isInitializing = false;
let initializationPromise: Promise<AppInitResult> | null = null;
// ==========================================================================

// 🔥 Функция для получения токена из URL
export const getTokenFromUrl = (): string | null => {
  console.log('[TOKEN] Searching for token in URL...');
  
  // 1. Пробуем получить токен из Telegram параметров
  const telegramToken = getTokenFromTelegramStartParam();
  if (telegramToken) {
    console.log('[TOKEN] ✓ Found from Telegram params:', telegramToken);
    return telegramToken;
  }
  
  // 2. Пробуем получить токен из обычных query параметров
  const urlParams = new URLSearchParams(window.location.search);
  const regularToken = urlParams.get('token');
  if (regularToken) {
    console.log('[TOKEN] ✓ Found from regular query params:', regularToken);
    return regularToken;
  }
  
  // 3. Проверяем hash (резервный вариант)
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    console.log('[TOKEN] Checking hash for token:', hash);
    
    // Ищем в hash разными паттернами
    const hashTokenMatch = hash.match(/token=([^&]+)/);
    if (hashTokenMatch) {
      console.log('[TOKEN] ✓ Found from hash token=:', hashTokenMatch[1]);
      return hashTokenMatch[1];
    }
  }
  
  console.log('[TOKEN] ✗ No token found in URL');
  return null;
};

// 🔥 Функция для очистки токена из URL
export const clearTokenFromUrl = (): void => {
  try {
    // Сохраняем только pathname, полностью удаляем query и hash
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
    console.log('[URL] ✓ Token cleared from URL');
  } catch (error) {
    console.error('[URL] Error clearing token from URL:', error);
    // Fallback: пробуем очистить только query параметры
    try {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    } catch (fallbackError) {
      console.error('[URL] Fallback also failed:', fallbackError);
    }
  }
};

// 🔥 Вспомогательная функция для преобразования Telegram пользователя
const convertToTelegramUser = (user: { id: string, first_name: string } | null) => {
  if (!user) return undefined;
  
  return {
    id: parseInt(user.id, 10) || 0,
    first_name: user.first_name,
    username: undefined,
    language_code: undefined,
    is_premium: undefined,
    photo_url: undefined
  };
};

// 🔥 Функция для инициализации гостевого режима
export const initGuestMode = async (token: string): Promise<GuestInitResult | null> => {
  try {
    console.log('[GUEST] Initializing guest mode with token:', token);
    const guestUser = await validateToken(token);
    
    if (!guestUser) {
      console.log('[GUEST] ✗ Invalid token, clearing from URL');
      clearTokenFromUrl();
      return null;
    }
    
    // 🔥 ПРОВЕРКА ДЛЯ РЕДАКТИРОВАНИЯ
    if (guestUser.permissions === 'edit') {
      const inTelegramWebApp = isInTelegramWebApp() || isInTelegramDirectWebApp();
      
      if (!inTelegramWebApp) {
        console.log('[GUEST] Edit permission detected outside Telegram, redirecting...');
        console.log('[GUEST] Note: Bot does not need to be running!');
        
        // 🔥 Добавляем небольшую задержку для лучшего UX
        setTimeout(() => {
          redirectToTelegramForEdit(token);
        }, 100);
        
        console.log('[GUEST] Redirecting to Telegram WebApp...');
        return null;
      } else {
        console.log('[GUEST] ✓ Edit permission in Telegram WebApp - allowing access');
      }
    }
    
    const ownerData = await loadUserData(guestUser.ownerId);
    console.log('[GUEST] ✓ Guest mode initialized successfully');
    
    return { guestUser, ownerData };
  } catch (error) {
    console.error('[GUEST] Guest mode initialization failed:', error);
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
    currentUserName = telegramUser.first_name;
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

// 🔥 Функция для создания объекта AppUser
export const createAppUser = (
  userId: string,
  userName: string,
  isGuest: boolean,
  isTelegram: boolean,
  guestData?: Partial<GuestUser>
): AppUser => {
  if (isGuest && guestData) {
    // 🔥 Получаем Telegram пользователя для гостя
    const telegramUserRaw = getTelegramUser();
    const telegramUser = convertToTelegramUser(telegramUserRaw);
    
    // Гостевой пользователь
    const guestUser: GuestUser = {
      userId: guestData.userId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: guestData.name || 'Гость',
      isGuest: true,
      sessionToken: guestData.sessionToken || '',
      permissions: guestData.permissions || 'view',
      ownerId: guestData.ownerId || '',
      ownerName: guestData.ownerName || 'Владельца',
      telegramUser: telegramUser // 🔥 Уже правильный тип: TelegramUser | undefined
    };
    
    return guestUser;
  }
  
  // 🔥 Получаем Telegram пользователя для владельца
  const telegramUserRaw = getTelegramUser();
  const telegramUser = convertToTelegramUser(telegramUserRaw);
  
  // Владелец (не гость)
  const ownerUser: OwnerUser = {
    userId,
    name: userName,
    isGuest: false,
    isTelegram,
    telegramUser: telegramUser // 🔥 Уже правильный тип: TelegramUser | undefined
  };
  
  return ownerUser;
};

// 🔥 Функция определения текущего пользователя
const getCurrentUserInfo = (): {
  userId: string;
  userName: string;
  telegramDetected: boolean;
  isAuthenticatedTelegramUser: boolean;
} => {
  const webApp = window.Telegram?.WebApp;
  
  if (webApp?.initDataUnsafe?.user) {
    // Telegram WebApp с пользователем
    const tgUser = webApp.initDataUnsafe.user;
    const userId = 'tg_' + tgUser.id;
    const userName = tgUser.first_name || tgUser.username || 'Telegram пользователь';
    
    console.log('[USER] Current user from Telegram WebApp:', {
      id: userId,
      name: userName,
      hasStartParam: !!webApp.initDataUnsafe.start_param
    });
    
    return {
      userId,
      userName,
      telegramDetected: true,
      isAuthenticatedTelegramUser: true
    };
  }
  
  // Fallback: старая логика
  const { currentUserId, currentUserName, telegramDetected } = initTelegramUser();
  
  return {
    userId: currentUserId,
    userName: currentUserName,
    telegramDetected,
    isAuthenticatedTelegramUser: telegramDetected && !currentUserId.includes('anon')
  };
};

// 🔥 Основная функция инициализации приложения
export const initializeApp = async (): Promise<AppInitResult> => {
  // Защита от повторной инициализации
  if (isInitializing && initializationPromise) {
    console.log('[INIT] Already initializing, returning existing promise');
    return initializationPromise;
  }
  
  isInitializing = true;
  
  console.log('[INIT] Starting app initialization...');
  console.log('[INIT] Serverless bot mode: Telegram links work without running bot');
  
  // Создаем промис один раз
  initializationPromise = (async () => {
    // Даем время для загрузки Telegram WebApp
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Проверяем токен в URL
    const token = getTokenFromUrl();
    
    console.log('[INIT DEBUG] Token check:', {
      token,
      hasTelegramWebApp: !!window.Telegram?.WebApp,
      startParam: window.Telegram?.WebApp?.initDataUnsafe?.start_param,
      user: window.Telegram?.WebApp?.initDataUnsafe?.user,
      location: window.location.href
    });
    
    if (token) {
      console.log('[INIT] Token found, initializing guest mode...');
      const guestResult = await initGuestMode(token);
      
      if (guestResult) {
        const { guestUser, ownerData } = guestResult;
        
        // Определяем тип доступа
        const isTelegramAccess = isInTelegramWebApp() || isInTelegramDirectWebApp();
        const isEditPermission = guestUser.permissions === 'edit';
        
        console.log('[INIT] Guest access details:', {
          isTelegram: isTelegramAccess,
          isEdit: isEditPermission,
          tokenSource: getTokenFromTelegramStartParam() ? 'Telegram WebApp' : 'Regular URL'
        });
        
        // Получаем информацию о текущем пользователе
        const { 
          userId: currentUserId, 
          userName: currentUserName, 
          telegramDetected,
          isAuthenticatedTelegramUser 
        } = getCurrentUserInfo();
        
        // 🔥 Определяем имя для отображения
        let displayUserName: string;
        if (isAuthenticatedTelegramUser) {
          // Реальный Telegram пользователь в гостевом режиме
          displayUserName = currentUserName;
          console.log('[INIT] Showing real Telegram user name:', displayUserName);
        } else {
          // Анонимный пользователь или веб-версия
          displayUserName = `Гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
          console.log('[INIT] Showing guest name:', displayUserName);
        }
        
        // Определяем ID для appUser
        const appUserId = isAuthenticatedTelegramUser 
          ? currentUserId 
          : `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        isInitializing = false;
        
        return {
          userName: displayUserName,
          userId: guestUser.ownerId,
          appUser: createAppUser(
            appUserId,
            displayUserName,
            true,
            telegramDetected,
            guestUser
          ),
          flights: ownerData.flights,
          airlines: ownerData.airlines,
          originCities: ownerData.originCities,
          destinationCities: ownerData.destinationCities
        };
      } else {
        console.log('[INIT] Guest mode initialization failed or redirected');
      }
    }
    
    // 🔥 Инициализация для владельца (не гостя)
    console.log('[INIT] Initializing as owner (not guest)');
    const { currentUserId, currentUserName, telegramDetected } = initTelegramUser();
    const userData = await loadUserData(currentUserId);
    
    isInitializing = false;
    
    return {
      userName: currentUserName,
      userId: currentUserId,
      appUser: createAppUser(currentUserId, currentUserName, false, telegramDetected),
      flights: userData.flights,
      airlines: userData.airlines,
      originCities: userData.originCities,
      destinationCities: userData.destinationCities
    };
    
  })();
  
  return initializationPromise;
};

// Функция для обработки ошибок инициализации
export const getFallbackInitResult = (error: any): AppInitResult => {
  console.error('[CRITICAL] App initialization crashed:', error);
  applyDefaultTheme();
  
  return {
    userName: 'Гость',
    userId: 'error_user',
    appUser: createAppUser('error_user', 'Гость', false, false),
    flights: [],
    airlines: [],
    originCities: [],
    destinationCities: []
  };
};

// Функция для сброса состояния инициализации
export const resetInitialization = (): void => {
  isInitializing = false;
  initializationPromise = null;
};

// Функция для отладки
export const debugInitialization = (): void => {
  console.log('[INIT DEBUG] Current state:', {
    isInitializing,
    hasToken: !!getTokenFromUrl(),
    inTelegramWebApp: isInTelegramWebApp(),
    inTelegramDirectWebApp: isInTelegramDirectWebApp(),
    tokenFromTelegram: getTokenFromTelegramStartParam(),
    telegramWebApp: window.Telegram?.WebApp ? {
      hasInitData: !!window.Telegram.WebApp.initData,
      startParam: window.Telegram.WebApp.initDataUnsafe?.start_param,
      user: window.Telegram.WebApp.initDataUnsafe?.user
    } : 'No Telegram WebApp',
    url: window.location.href,
    searchParams: window.location.search,
    hash: window.location.hash
  });
};