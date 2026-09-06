import { AppUser, GuestUser, OwnerUser } from '../shared/types/shared';
import { Flight } from '../shared/types';
import { 
  getTelegramWebApp, 
  getTelegramUser, 
  getDevelopmentUserId, 
  initTelegramWebApp,
  applyDefaultTheme 
} from '../shared/utils';
import { 
  isInTelegramWebApp,
  isInTelegramDirectWebApp 
} from '../shared/utils/telegramUtils';
import { 
  getTokenFromTelegramStartParam 
} from '../shared/utils/telegramTokens';
import { loadUserData } from './dataService';
import { authenticateGuest, authenticateOwner } from './authService';
import { generateShortId } from '../shared/utils/id';
import { isRealTelegramUser, getTelegramUserType } from '../shared/utils/telegramUserType';
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
    ok: boolean;
  };
}

let isInitializing = false;
let initializationPromise: Promise<AppInitResult> | null = null;

export const getTokenFromUrl = (): string | null => {
  const telegramToken = getTokenFromTelegramStartParam();
  if (telegramToken) {
    return telegramToken;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const regularToken = urlParams.get('token');
  if (regularToken) {
    return regularToken;
  }
  
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    const hashTokenMatch = hash.match(/token=([^&]+)/);
    if (hashTokenMatch) {
      return hashTokenMatch[1];
    }
  }
  
  return null;
};

export { clearTokenFromUrl };

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
    if (!ownerData.ok) {
      logError('[GUEST] Failed to load owner flights');
      return null;
    }
    clearTokenFromUrl();
    devLog('[GUEST] Guest mode initialized');

    return { guestUser, ownerData };
  } catch (error) {
    logError('[GUEST] Guest mode initialization failed:', error);
    clearTokenFromUrl();
    return null;
  }
};

export const initTelegramUser = (): {
  currentUserId: string;
  currentUserName: string;
  telegramDetected: boolean;
} => {
  const webApp = getTelegramWebApp();
  
  if (!webApp) {
    devLog('[INIT] No Telegram WebApp, using development mode');
    applyDefaultTheme();
    return {
      currentUserId: getDevelopmentUserId(),
      currentUserName: 'Разработчик',
      telegramDetected: false
    };
  }

  if (!webApp.initData) {
    devLog('[INIT] Telegram SDK present without launch data, treating as web');
    applyDefaultTheme();
    return {
      currentUserId: getDevelopmentUserId(),
      currentUserName: 'Разработчик',
      telegramDetected: false
    };
  }
  
  devLog('[INIT] Telegram WebApp detected');
  initTelegramWebApp(webApp);
  
  const telegramUser = getTelegramUser();
  let currentUserId: string;
  let currentUserName: string;
  
  if (telegramUser) {
    currentUserId = 'tg_' + telegramUser.id;
    currentUserName = telegramUser.first_name;
    devLog('[INIT] Using Telegram user:', { id: currentUserId, name: currentUserName });
  } else {
    currentUserId = 'telegram_anon_' + generateShortId(8);
    currentUserName = 'Аноним';
    devLog('[INIT] Using anonymous Telegram user');
  }
  
  return {
    currentUserId,
    currentUserName,
    telegramDetected: true
  };
};

export const createAppUser = (
  userId: string,
  userName: string,
  isGuest: boolean,
  isTelegram: boolean,
  guestData?: Partial<GuestUser>
): AppUser => {
  if (isGuest && guestData) {
    const telegramUserRaw = getTelegramUser();
    const telegramUser = convertToTelegramUser(telegramUserRaw);
    
    const guestUser: GuestUser = {
      userId: guestData.userId || `guest_${Date.now()}_${generateShortId(5)}`,
      name: guestData.name || 'Гость',
      isGuest: true,
      sessionToken: guestData.sessionToken || '',
      permissions: guestData.permissions || 'view',
      ownerId: guestData.ownerId || '',
      ownerName: guestData.ownerName || 'Владельца',
      telegramUser: telegramUser
    };
    
    return guestUser;
  }
  
  const telegramUserRaw = getTelegramUser();
  const telegramUser = convertToTelegramUser(telegramUserRaw);
  
  const ownerUser: OwnerUser = {
    userId,
    name: userName,
    isGuest: false,
    isTelegram,
    telegramUser: telegramUser
  };
  
  return ownerUser;
};

const getCurrentUserInfo = (): {
  userId: string;
  userName: string;
  telegramDetected: boolean;
  isAuthenticatedTelegramUser: boolean;
  userType: 'real_telegram' | 'anonymous_telegram' | 'web_browser';
} => {
  const webApp = window.Telegram?.WebApp;
  const userType = getTelegramUserType();
  
  if (userType === 'real_telegram') {
    const tgUser = webApp!.initDataUnsafe!.user!;
    const userId = 'tg_' + tgUser.id;
    const userName = tgUser.first_name || tgUser.username || 'Telegram пользователь';
    
    return {
      userId,
      userName,
      telegramDetected: true,
      isAuthenticatedTelegramUser: true,
      userType,
    };
  }

  if (userType === 'anonymous_telegram') {
    return {
      userId: 'telegram_anon_' + generateShortId(8),
      userName: 'Аноним',
      telegramDetected: true,
      isAuthenticatedTelegramUser: false,
      userType,
    };
  }
  
  return {
    userId: getDevelopmentUserId(),
    userName: 'Гость',
    telegramDetected: false,
    isAuthenticatedTelegramUser: false,
    userType: 'web_browser',
  };
};

export const initializeApp = async (): Promise<AppInitResult> => {
  if (isInitializing && initializationPromise) {
    devLog('[INIT] Already initializing, returning existing promise');
    return initializationPromise;
  }
  
  isInitializing = true;
  devLog('[INIT] Starting app initialization...');
  
  initializationPromise = (async () => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const token = getTokenFromUrl();
    
    if (token) {
      devLog('[INIT] Invitation token found, initializing guest mode');
      const guestResult = await initGuestMode(token);
      
      if (guestResult) {
        const { guestUser, ownerData } = guestResult;
        const { 
          userId: currentUserId, 
          userName: currentUserName, 
          telegramDetected,
          isAuthenticatedTelegramUser,
          userType 
        } = getCurrentUserInfo();
        
        let displayUserName: string;
        
        switch (userType) {
          case 'real_telegram':
            displayUserName = currentUserName;
            break;
          case 'anonymous_telegram':
            displayUserName = `Анонимный гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
            break;
          case 'web_browser':
          default:
            displayUserName = `Веб-гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
            break;
        }
        
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
      }

      devLog('[INIT] Guest mode initialization failed');
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
    if (!userData.ok) {
      isInitializing = false;
      throw new Error('Failed to load flights');
    }
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

export const getFallbackInitResult = (error: unknown): AppInitResult => {
  logError('[CRITICAL] App initialization crashed:', error);
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

export const resetInitialization = (): void => {
  isInitializing = false;
  initializationPromise = null;
};

export const debugInitialization = (): void => {
  devLog('[INIT DEBUG] Current state:', {
    isInitializing,
    hasToken: !!getTokenFromUrl(),
    inTelegramWebApp: isInTelegramWebApp(),
    inTelegramDirectWebApp: isInTelegramDirectWebApp(),
    tokenFromTelegram: Boolean(getTokenFromTelegramStartParam()),
    hasTelegramWebApp: Boolean(window.Telegram?.WebApp),
    hasInitData: Boolean(window.Telegram?.WebApp?.initData),
    isRealTelegramUser: isRealTelegramUser()
  });
};
