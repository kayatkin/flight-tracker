import { AppUser, GuestUser, OwnerUser } from '../shared/types/shared';
import { Flight } from '../shared/types';
import { 
  getTelegramWebApp, 
  getTelegramUser, 
  getDevelopmentUserId, 
  initTelegramWebApp,
  applyDefaultTheme 
} from '../shared/utils';
// Обновляем импорт для безсерверной версии
import { 
  isInTelegramWebApp,
  isInTelegramDirectWebApp 
} from '../shared/utils/telegramUtils';
// Импортируем только getTokenFromTelegramStartParam
import { 
  getTokenFromTelegramStartParam 
} from '../shared/utils/telegramTokens';
import { loadUserData } from './dataService';
import { authenticateGuest, authenticateOwner } from './authService';
import { generateShortId } from '../shared/utils/id';
import { isRealTelegramUser } from '../shared/utils/telegramUserType';
import { clearTokenFromUrl } from '../shared/utils/url';
import { devLog, logError } from '../shared/utils/logger';

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
const PROCESSED_INVITATION_TOKEN_KEY = 'processed_invitation_token';
const IGNORED_INVITATION_TOKEN_KEY = 'ignored_invitation_token';
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

export { clearTokenFromUrl };

export const ignoreInvitationTokenForSession = (token: string | null): void => {
  if (!token) return;
  sessionStorage.setItem(IGNORED_INVITATION_TOKEN_KEY, token);
  sessionStorage.removeItem(PROCESSED_INVITATION_TOKEN_KEY);
};

export const clearIgnoredInvitationToken = (): void => {
  sessionStorage.removeItem(IGNORED_INVITATION_TOKEN_KEY);
  sessionStorage.removeItem(PROCESSED_INVITATION_TOKEN_KEY);
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
    devLog('[GUEST] Authenticating share token via Edge Function');
    const guestUser = await authenticateGuest(token);

    if (!guestUser) {
      devLog('[GUEST] Invalid token, clearing from URL');
      clearTokenFromUrl();
      return null;
    }

    const ownerData = await loadUserData(guestUser.ownerId);
    devLog('[GUEST] Guest mode initialized');

    return { guestUser, ownerData };
  } catch (error) {
    logError('[GUEST] Guest mode initialization failed:', error);
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
    currentUserId = 'telegram_anon_' + generateShortId(8);
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
      userId: guestData.userId || `guest_${Date.now()}_${generateShortId(5)}`,
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

// 🔥 УЛУЧШЕННАЯ ФУНКЦИЯ определения текущего пользователя
const getCurrentUserInfo = (): {
  userId: string;
  userName: string;
  telegramDetected: boolean;
  isAuthenticatedTelegramUser: boolean;
  userType: 'real_telegram' | 'anonymous_telegram' | 'web_browser';
} => {
  const webApp = window.Telegram?.WebApp;
  
  if (isRealTelegramUser()) {
    // ✅ Реальный Telegram пользователь (с ID)
    const tgUser = webApp!.initDataUnsafe!.user!;
    const userId = 'tg_' + tgUser.id;
    const userName = tgUser.first_name || tgUser.username || 'Telegram пользователь';
    
    console.log('[USER] ✅ Real Telegram user detected:', {
      id: userId,
      name: userName,
      hasStartParam: !!webApp!.initDataUnsafe!.start_param,
      userType: 'real_telegram'
    });
    
    return {
      userId,
      userName,
      telegramDetected: true,
      isAuthenticatedTelegramUser: true,
      userType: 'real_telegram'
    };
  } else if (webApp) {
    // ⚠️ Telegram WebApp, но без данных пользователя (аноним)
    const userId = 'telegram_anon_' + generateShortId(8);
    const userName = 'Аноним';
    
    console.log('[USER] ⚠️ Anonymous Telegram WebApp user', {
      userType: 'anonymous_telegram',
      hasInitData: !!webApp.initData,
      hasStartParam: !!webApp.initDataUnsafe?.start_param
    });
    
    return {
      userId,
      userName,
      telegramDetected: true,
      isAuthenticatedTelegramUser: false,
      userType: 'anonymous_telegram'
    };
  }
  
  // 🌐 Нет Telegram WebApp = веб-браузер
  console.log('[USER] 🌐 Web browser user (not Telegram)', {
    userType: 'web_browser'
  });
  const devUserId = getDevelopmentUserId();
  
  return {
    userId: devUserId,
    userName: 'Гость',
    telegramDetected: false,
    isAuthenticatedTelegramUser: false,
    userType: 'web_browser'
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
    const ignoredToken = sessionStorage.getItem(IGNORED_INVITATION_TOKEN_KEY);
    const shouldIgnoreToken = !!token && ignoredToken === token;
    
    console.log('[INIT DEBUG] Token check:', {
      token,
      hasTelegramWebApp: !!window.Telegram?.WebApp,
      startParam: window.Telegram?.WebApp?.initDataUnsafe?.start_param,
      user: window.Telegram?.WebApp?.initDataUnsafe?.user,
      location: window.location.href,
      ignoredToken: shouldIgnoreToken
    });
    
    // Revalidate share tokens on each load. A stale "processed" flag survives
    // refreshes, while explicit ignored tokens are only set when a guest leaves.
    if (token && !shouldIgnoreToken) {
      clearIgnoredInvitationToken();
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
          isAuthenticatedTelegramUser,
          userType 
        } = getCurrentUserInfo();
        
        // 🔥 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Определяем имя для отображения
        let displayUserName: string;
        
        switch (userType) {
          case 'real_telegram':
            displayUserName = currentUserName;
            console.log('[INIT] ✅ Showing real Telegram user name:', displayUserName);
            break;
            
          case 'anonymous_telegram':
            displayUserName = `Анонимный гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
            console.log('[INIT] ⚠️ Showing anonymous Telegram guest name:', displayUserName);
            break;
            
          case 'web_browser':
          default:
            displayUserName = `Веб-гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
            console.log('[INIT] 🌐 Showing web guest name:', displayUserName);
            break;
        }
        
        // Определяем ID для appUser
        const appUserId = isAuthenticatedTelegramUser 
          ? currentUserId 
          : `guest_${Date.now()}_${generateShortId(5)}`;
        
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
    } else if (shouldIgnoreToken) {
      console.log('[INIT] Token ignored for this session after leaving guest mode');
    } else {
      clearIgnoredInvitationToken();
    }
    
    devLog('[INIT] Initializing as owner');
    const { telegramDetected } = initTelegramUser();
    const auth = await authenticateOwner();

    if (!auth) {
      logError('[INIT] Owner authentication failed');
      isInitializing = false;
      throw new Error('Authentication required');
    }

    const userData = await loadUserData(auth.userId);
    isInitializing = false;

    return {
      userName: auth.userName,
      userId: auth.userId,
      appUser: createAppUser(auth.userId, auth.userName, false, telegramDetected),
      flights: userData.flights,
      airlines: userData.airlines,
      originCities: userData.originCities,
      destinationCities: userData.destinationCities,
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
    hash: window.location.hash,
    isRealTelegramUser: isRealTelegramUser()
  });
};