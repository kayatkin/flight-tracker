import { useState, useCallback, useEffect } from 'react';
import { Flight } from '../../shared/types';
import { AppUser } from '../../shared/types';
import { 
  initializeApp, 
  initGuestMode,
  clearTokenFromUrl 
} from '../../services/appInitService';
import { saveOwnerData, saveGuestData, deleteFlightData } from '../../services/dataService';
import { signOutAuth } from '../../services/authService';
import { getTelegramUserType } from '../utils/telegramUserType';
import { toast } from '@shared/ui/Toast';
import { devLog, logError } from '../utils/logger';

interface UseFlightTrackerResult {
  // Состояния
  userName: string;
  userId: string;
  appUser: AppUser | null;
  flights: Flight[];
  airlines: string[];
  originCities: string[];
  destinationCities: string[];
  loading: boolean;
  isCheckingToken: boolean;
  
  // Обработчики
  handleAddFlight: (flight: Flight) => void;
  handleDeleteFlight: (id: string) => void;
  handleJoinSession: (token: string) => Promise<void>;
  handleLeaveGuestMode: () => void;
  
  // Действия
  setActiveTab: (tab: 'add' | 'history') => void;
  setShowShareModal: (show: boolean) => void;
}

export const useFlightTracker = (): UseFlightTrackerResult => {
  const [userName, setUserName] = useState<string>('Гость');
  const [userId, setUserId] = useState<string>('');
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destinationCities, setDestinationCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(true);
  
  // Заглушка для setShowShareModal (реализация в App.tsx)
  const setShowShareModal = useCallback((_show: boolean) => {
    // Реализация будет в App.tsx
  }, []);

  // Инициализация приложения
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('[HOOK] Starting app initialization...');
        const initResult = await initializeApp();
        
        console.log('[HOOK] App initialized:', {
          userName: initResult.userName,
          userId: initResult.userId,
          isGuest: initResult.appUser.isGuest,
          flightsCount: initResult.flights.length,
          userType: getTelegramUserType()
        });
        
        setUserName(initResult.userName);
        setUserId(initResult.userId);
        setAppUser(initResult.appUser);
        setFlights(initResult.flights);
        setAirlines(initResult.airlines);
        setOriginCities(initResult.originCities);
        setDestinationCities(initResult.destinationCities);
      } catch (err) {
        console.error('[HOOK] App initialization failed:', err);
        toast('Не удалось загрузить данные. Проверьте подключение и перезагрузите приложение.', 'error');
        setUserName('Ошибка загрузки');
        setUserId('');
        setAppUser(null);
        setFlights([]);
        setAirlines([]);
        setOriginCities([]);
        setDestinationCities([]);
      } finally {
        setLoading(false);
        setIsCheckingToken(false);
      }
    };
    
    initApp();
  }, []);

  // Автосохранение данных
  useEffect(() => {
    if (loading || !userId || !appUser) return;
    
    const saveData = async () => {
      try {
        console.log('[HOOK] Auto-saving data...', {
          isGuest: appUser.isGuest,
          hasEditPermission: appUser.isGuest && appUser.permissions === 'edit',
          flightsCount: flights.length
        });
        
        if (appUser.isGuest && appUser.permissions === 'edit') {
          await saveGuestData(appUser.ownerId, flights);
          console.log('[HOOK] Guest data saved to owner:', appUser.ownerId);
        } else if (!appUser.isGuest) {
          await saveOwnerData(userId, flights, airlines, originCities, destinationCities);
          console.log('[HOOK] Owner data saved');
        }
      } catch (err) {
        console.error('[HOOK] Save error:', err);
      }
    };
    
    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [flights, airlines, originCities, destinationCities, loading, userId, appUser]);

  // Обработчики
  const handleAddFlight = useCallback((newFlight: Flight) => {
    console.log('[HOOK] Adding flight:', newFlight);
    setFlights(prev => [...prev, newFlight]);
    
    if (newFlight.airline && !airlines.includes(newFlight.airline)) {
      setAirlines(prev => [...prev, newFlight.airline]);
    }
    if (newFlight.origin && !originCities.includes(newFlight.origin)) {
      setOriginCities(prev => [...prev, newFlight.origin]);
    }
    if (newFlight.destination && !destinationCities.includes(newFlight.destination)) {
      setDestinationCities(prev => [...prev, newFlight.destination]);
    }
  }, [airlines, originCities, destinationCities]);

  const handleDeleteFlight = useCallback((id: string) => {
    console.log('[HOOK] Deleting flight:', id);
    const deletedIndex = flights.findIndex((flight) => flight.id === id);
    const deletedFlight = deletedIndex >= 0 ? flights[deletedIndex] : undefined;
    setFlights(prev => prev.filter(f => f.id !== id));

    const ownerId = appUser?.isGuest ? appUser.ownerId : userId;
    if (!ownerId || !appUser) return;

    deleteFlightData(ownerId, id).catch((err) => {
      logError('[HOOK] Delete error:', err);
      if (deletedFlight) {
        setFlights((prev) => {
          if (prev.some((flight) => flight.id === id)) return prev;
          const restored = [...prev];
          restored.splice(Math.min(deletedIndex, restored.length), 0, deletedFlight);
          return restored;
        });
      }
      toast('Не удалось удалить билет', 'error');
    });
  }, [appUser, flights, userId]);

  const handleJoinSession = useCallback(async (token: string) => {
    try {
      console.log('[HOOK] Joining session with token:', token);
      setLoading(true);
      
      // 🔥 ОЧИЩАЕМ ПРЕДЫДУЩИЙ ФЛАГ ОБРАБОТКИ
      sessionStorage.removeItem('processed_invitation_token');
      
      const guestResult = await initGuestMode(token);
      
      if (guestResult) {
        const { guestUser, ownerData } = guestResult;
        
        console.log('[HOOK] Guest result:', {
          permissions: guestUser.permissions,
          ownerId: guestUser.ownerId,
          flightsCount: ownerData.flights.length
        });
        
        // 🔥 УЛУЧШЕННАЯ ЛОГИКА: Определяем имя для отображения
        const userType = getTelegramUserType();
        let displayName: string;
        
        switch (userType) {
          case 'real_telegram': {
            const tgUser = window.Telegram!.WebApp!.initDataUnsafe!.user!;
            displayName = tgUser.first_name || tgUser.username || 'Telegram пользователь';
            devLog('[HOOK] Real Telegram user joining:', displayName);
            break;
          }
            
          case 'anonymous_telegram':
            // ⚠️ Аноним в Telegram WebApp
            displayName = `Анонимный гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
            console.log('[HOOK] ⚠️ Anonymous Telegram user joining');
            break;
            
          case 'web_browser':
          default:
            // 🌐 Веб-браузер
            displayName = `Веб-гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
            console.log('[HOOK] 🌐 Web user joining');
            break;
        }
        
        // Обновляем состояние
        setAppUser(guestUser);
        setUserId(guestUser.ownerId);
        setUserName(displayName);
        setFlights(ownerData.flights);
        setAirlines(ownerData.airlines);
        setOriginCities(ownerData.originCities);
        setDestinationCities(ownerData.destinationCities);
        
        // 🔥 Обновляем URL только для веб-браузера (не для Telegram)
        if (userType === 'web_browser') {
          const newUrl = `${window.location.origin}${window.location.pathname}?token=${token}`;
          window.history.pushState({}, '', newUrl);
          console.log('[HOOK] URL updated with token (web only)');
        }
        
        toast(
          `Вы присоединились. Права: ${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'}`,
          'success'
        );
      } else {
        devLog('[HOOK] Invalid or expired token');
        toast('Неверный или просроченный токен', 'error');
      }
    } catch (err) {
      logError('[HOOK] Join error:', err);
      toast('Ошибка при присоединении', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 ИСПРАВЛЕННАЯ функция выхода из гостевого режима
  const handleLeaveGuestMode = useCallback(async () => {
    console.log('[EXIT] Leaving guest mode...', {
      isGuest: appUser?.isGuest,
      userType: getTelegramUserType(),
      hasTelegramWebApp: !!window.Telegram?.WebApp,
      currentUrl: window.location.href
    });
    
    try {
      // 🔥 КЛЮЧЕВОЕ: Определяем тип пользователя
      const userType = getTelegramUserType();
      await signOutAuth();
      
      // 1. Очищаем токен из URL (всегда делаем это)
      clearTokenFromUrl();
      
      // 2. Определяем правильное действие в зависимости от типа пользователя
      switch (userType) {
        case 'real_telegram':
          // ✅ СЦЕНАРИЙ 1: Реальный Telegram пользователь
          console.log('[EXIT] ✅ Real Telegram user in guest mode - reloading (staying in Mini App)...');
          
          // Telegram пользователь должен остаться в Mini App
          // Просто перезагружаем страницу - он останется авторизованным
          setTimeout(() => {
            window.location.reload();
          }, 100);
          break;
          
        case 'anonymous_telegram':
          // ⚠️ СЦЕНАРИЙ 2: Аноним в Telegram WebApp
          console.log('[EXIT] ⚠️ Anonymous Telegram user - closing Mini App...');
          
          // Анонимного пользователя закрываем (ему нечего терять)
          setTimeout(() => {
            try {
              window.Telegram!.WebApp!.close();
            } catch (closeError) {
              console.error('[EXIT] Failed to close WebApp:', closeError);
              window.location.reload();
            }
          }, 100);
          break;
          
        case 'web_browser':
          // 🌐 СЦЕНАРИЙ 3: Веб-браузер
          console.log('[EXIT] 🌐 Web browser - redirecting to main page...');
          
          // Веб-версия: редирект на главную без токена
          setTimeout(() => {
            window.location.href = window.location.origin + window.location.pathname;
          }, 100);
          break;
          
        default:
          // 🔧 СЦЕНАРИЙ 4: Запасной вариант
          console.log('[EXIT] 🔧 Fallback - reloading...');
          window.location.reload();
          break;
      }
      
    } catch (error) {
      console.error('[EXIT] Error leaving guest mode:', error);
      // Аварийный fallback
      clearTokenFromUrl();
      window.location.reload();
    }
  }, [appUser]);

  return {
    // Состояния
    userName,
    userId,
    appUser,
    flights,
    airlines,
    originCities,
    destinationCities,
    loading,
    isCheckingToken,
    
    // Обработчики
    handleAddFlight,
    handleDeleteFlight,
    handleJoinSession,
    handleLeaveGuestMode,
    
    // Действия
    setActiveTab: () => {}, // Переопределяется в App.tsx
    setShowShareModal,
  };
};