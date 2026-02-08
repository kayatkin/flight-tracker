// src/shared/hooks/useFlightTracker.ts
import { useState, useCallback, useEffect } from 'react';
import { Flight } from '../../shared/types';
import { AppUser } from '../../shared/types';
import { 
  initializeApp, 
  getFallbackInitResult, 
  initGuestMode,
  clearTokenFromUrl 
} from '../../services/appInitService';
import { saveOwnerData, saveGuestData } from '../../services/dataService';

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
          flightsCount: initResult.flights.length
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
        const fallbackResult = getFallbackInitResult(err);
        
        setUserName(fallbackResult.userName);
        setUserId(fallbackResult.userId);
        setAppUser(fallbackResult.appUser);
        setFlights(fallbackResult.flights);
        setAirlines(fallbackResult.airlines);
        setOriginCities(fallbackResult.originCities);
        setDestinationCities(fallbackResult.destinationCities);
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
    setFlights(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleJoinSession = useCallback(async (token: string) => {
    try {
      console.log('[HOOK] Joining session with token:', token);
      setLoading(true);
      const guestResult = await initGuestMode(token);
      
      if (guestResult) {
        const { guestUser, ownerData } = guestResult;
        
        console.log('[HOOK] Guest result:', {
          permissions: guestUser.permissions,
          ownerId: guestUser.ownerId,
          flightsCount: ownerData.flights.length
        });
        
        // Определяем имя для отображения
        const webApp = window.Telegram?.WebApp;
        let displayName: string;
        
        if (webApp?.initDataUnsafe?.user) {
          // Telegram пользователь в гостевом режиме
          const tgUser = webApp.initDataUnsafe.user;
          displayName = tgUser.first_name || 
                       tgUser.username || 
                       `Гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
          
          console.log('[HOOK] Telegram user in guest mode:', { 
            first_name: tgUser.first_name,
            username: tgUser.username,
            displayName 
          });
        } else {
          // Анонимный пользователь (без Telegram)
          displayName = `Гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
          console.log('[HOOK] Anonymous user in guest mode');
        }
        
        // Обновляем состояние
        setAppUser(guestUser);
        setUserId(guestUser.ownerId);
        setUserName(displayName);
        setFlights(ownerData.flights);
        setAirlines(ownerData.airlines);
        setOriginCities(ownerData.originCities);
        setDestinationCities(ownerData.destinationCities);
        
        // Обновляем URL с токеном (только для веб-версии)
        // В Telegram WebApp URL не меняется
        if (!window.Telegram?.WebApp) {
          const newUrl = `${window.location.origin}${window.location.pathname}?token=${token}`;
          window.history.pushState({}, '', newUrl);
          console.log('[HOOK] URL updated with token');
        }
        
        alert(`✅ Вы успешно присоединились!\nПрава: ${guestUser.permissions === 'edit' ? 'Редактирование' : 'Просмотр'}`);
      } else {
        console.log('[HOOK] Invalid or expired token');
        alert('❌ Неверный или просроченный токен');
      }
    } catch (err) {
      console.error('[HOOK] Join error:', err);
      alert('❌ Ошибка при присоединении');
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 ИСПРАВЛЕННАЯ функция выхода из гостевого режима
  const handleLeaveGuestMode = useCallback(() => {
    console.log('[HOOK] Leaving guest mode...', {
      isGuest: appUser?.isGuest,
      inTelegramWebApp: !!window.Telegram?.WebApp,
      currentUrl: window.location.href
    });
    
    try {
      // Проверяем, находимся ли мы в Telegram WebApp
      const webApp = window.Telegram?.WebApp;
      
      if (webApp && appUser?.isGuest) {
        // 🔥 СЦЕНАРИЙ 1: Telegram WebApp в гостевом режиме
        console.log('[HOOK] Telegram WebApp in guest mode - closing...');
        
        // Очищаем токен из URL перед закрытием
        clearTokenFromUrl();
        
        // Добавляем небольшую задержку для гарантированного сохранения
        setTimeout(() => {
          try {
            webApp.close();
            console.log('[HOOK] Telegram WebApp closed');
          } catch (closeError) {
            console.error('[HOOK] Failed to close WebApp:', closeError);
            // Fallback: перезагружаем страницу
            window.location.reload();
          }
        }, 50);
        
      } else if (webApp && !appUser?.isGuest) {
        // 🔥 СЦЕНАРИЙ 2: Telegram WebApp, но не в гостевом режиме (владелец)
        console.log('[HOOK] Telegram WebApp owner - reloading...');
        window.location.reload();
        
      } else if (!webApp && appUser?.isGuest) {
        // 🔥 СЦЕНАРИЙ 3: Веб-версия в гостевом режиме
        console.log('[HOOK] Web version in guest mode - redirecting...');
        clearTokenFromUrl();
        window.location.href = window.location.origin + window.location.pathname;
        
      } else {
        // 🔥 СЦЕНАРИЙ 4: Веб-версия, не гость (владелец или аноним)
        console.log('[HOOK] Web version owner/anonymous - redirecting...');
        window.location.href = window.location.origin + window.location.pathname;
      }
      
    } catch (error) {
      console.error('[HOOK] Error leaving guest mode:', error);
      // Аварийный fallback
      clearTokenFromUrl();
      window.location.href = window.location.origin + window.location.pathname;
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