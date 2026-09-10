import { useState, useCallback, useEffect, useRef } from 'react';
import { Flight } from '../../shared/types';
import { AppUser } from '../../shared/types';
import { 
  initializeApp, 
  getFallbackInitResult, 
  initGuestMode,
  clearTokenFromUrl 
} from '../../services/appInitService';
import { saveOwnerData, saveGuestData } from '../../services/dataService';
import { getTelegramUserType } from '../utils/telegramUserType';
import { duplicateFlight } from '../utils/flightFormMapping';
import { toast } from '@shared/ui/Toast';
import { devLog, logError } from '../utils/logger';
import {
  resolveInitSaveStatus,
  type SaveStatus,
} from '../utils/saveStatus';

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
  saveStatus: SaveStatus;
  
  // Обработчики
  handleAddFlight: (flight: Flight) => void;
  handleUpdateFlight: (flight: Flight) => void;
  handleDuplicateFlight: (flight: Flight) => void;
  handleDeleteFlight: (id: string) => void;
  handleRestoreFlight: (flight: Flight) => void;
  handleJoinSession: (token: string) => Promise<void>;
  handleLeaveGuestMode: () => void;
  retrySave: () => void;
  
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const hydratedRef = useRef(false);
  const skipNextSaveRef = useRef(true);
  const knownFlightIdsRef = useRef<string[]>([]);
  const saveGenerationRef = useRef(0);
  const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);
  const pendingTimerRef = useRef<number | undefined>(undefined);

  const setShowShareModal = useCallback((_show: boolean) => {
    // Реализация будет в App.tsx
  }, []);

  const applyInitResult = useCallback((
    result: {
      userName: string;
      userId: string;
      appUser: AppUser;
      flights: Flight[];
      airlines: string[];
      originCities: string[];
      destinationCities: string[];
    },
    hydrated: boolean
  ) => {
    setUserName(result.userName);
    setUserId(result.userId);
    setAppUser(result.appUser);
    setFlights(result.flights);
    setAirlines(result.airlines);
    setOriginCities(result.originCities);
    setDestinationCities(result.destinationCities);
    hydratedRef.current = hydrated;
    skipNextSaveRef.current = true;
    knownFlightIdsRef.current = result.flights.map((flight) => flight.id);
    setSaveStatus(resolveInitSaveStatus({
      hydrated,
      isViewGuest: result.appUser.isGuest && result.appUser.permissions === 'view',
    }));
  }, []);

  // Инициализация приложения
  useEffect(() => {
    const initApp = async () => {
      try {
        devLog('[HOOK] Starting app initialization...');
        const initResult = await initializeApp();
        
        devLog('[HOOK] App initialized:', {
          userName: initResult.userName,
          userId: initResult.userId,
          isGuest: initResult.appUser.isGuest,
          flightsCount: initResult.flights.length,
          userType: getTelegramUserType()
        });
        
        applyInitResult(initResult, true);
      } catch (err) {
        logError('[HOOK] App initialization failed:', err);
        applyInitResult(getFallbackInitResult(err), false);
      } finally {
        setLoading(false);
        setIsCheckingToken(false);
      }
    };
    
    initApp();
  }, [applyInitResult]);

  const setClosingLock = useCallback((locked: boolean) => {
    const webApp = window.Telegram?.WebApp;
    try {
      if (locked) {
        webApp?.enableClosingConfirmation?.();
      } else {
        webApp?.disableClosingConfirmation?.();
      }
    } catch (error) {
      logError('[HOOK] Closing confirmation failed:', error);
    }
  }, []);

  // Автосохранение данных — только после успешной загрузки и локальных изменений
  useEffect(() => {
    if (loading || !userId || !appUser || !hydratedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (appUser.isGuest && appUser.permissions !== 'edit') return;

    const generation = ++saveGenerationRef.current;
    const snapshot = flights;
    const knownIds = knownFlightIdsRef.current;

    const saveData = async () => {
      if (generation !== saveGenerationRef.current) return;
      setSaveStatus('saving');
      try {
        const options = { knownFlightIds: knownIds };
        if (appUser.isGuest && appUser.permissions === 'edit') {
          await saveGuestData(appUser.ownerId, snapshot, options);
        } else if (!appUser.isGuest) {
          await saveOwnerData(userId, snapshot, airlines, originCities, destinationCities, options);
        }
        if (generation === saveGenerationRef.current) {
          knownFlightIdsRef.current = snapshot.map((flight) => flight.id);
          pendingSaveRef.current = null;
          setClosingLock(false);
          setSaveStatus('saved');
        }
      } catch (err) {
        logError('[HOOK] Save error:', err);
        toast('Не удалось сохранить изменения. Проверьте соединение.', 'error');
        if (generation === saveGenerationRef.current) {
          setSaveStatus('error');
        }
      }
    };

    pendingSaveRef.current = saveData;
    setSaveStatus('pending');
    setClosingLock(true);
    pendingTimerRef.current = window.setTimeout(() => {
      void saveData();
    }, 2000);

    return () => {
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
      }
    };
  }, [flights, airlines, originCities, destinationCities, loading, userId, appUser, setClosingLock]);

  useEffect(() => {
    const flushPendingSave = () => {
      const saveData = pendingSaveRef.current;
      if (!saveData) return;
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = undefined;
      }
      void saveData();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };

    window.addEventListener('pagehide', flushPendingSave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushPendingSave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const retrySave = useCallback(() => {
    const saveData = pendingSaveRef.current;
    if (!saveData) return;
    if (pendingTimerRef.current) {
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = undefined;
    }
    void saveData();
  }, []);

  const canMutate = useCallback(() => {
    if (appUser?.isGuest && appUser.permissions === 'view') {
      return false;
    }
    return true;
  }, [appUser]);

  const rememberFlightLookups = useCallback((flight: Flight) => {
    if (flight.airline) {
      setAirlines((prev) => (prev.includes(flight.airline) ? prev : [...prev, flight.airline]));
    }
    if (flight.origin) {
      setOriginCities((prev) => (prev.includes(flight.origin) ? prev : [...prev, flight.origin]));
    }
    if (flight.destination) {
      setDestinationCities((prev) => (
        prev.includes(flight.destination) ? prev : [...prev, flight.destination]
      ));
    }
  }, []);

  const handleAddFlight = useCallback((newFlight: Flight) => {
    if (!canMutate()) {
      toast('У вас нет прав для добавления билетов. Только просмотр.', 'warning');
      return;
    }
    devLog('[HOOK] Adding flight:', newFlight.id);
    setFlights(prev => [...prev, newFlight]);
    rememberFlightLookups(newFlight);
  }, [canMutate, rememberFlightLookups]);

  const handleUpdateFlight = useCallback((updatedFlight: Flight) => {
    if (!canMutate()) {
      toast('У вас нет прав для изменения билетов. Только просмотр.', 'warning');
      return;
    }
    devLog('[HOOK] Updating flight:', updatedFlight.id);
    setFlights((prev) => prev.map((flight) => (
      flight.id === updatedFlight.id ? updatedFlight : flight
    )));
    rememberFlightLookups(updatedFlight);
  }, [canMutate, rememberFlightLookups]);

  const handleDuplicateFlight = useCallback((flight: Flight) => {
    if (!canMutate()) {
      toast('У вас нет прав для добавления билетов. Только просмотр.', 'warning');
      return;
    }
    const cloned = duplicateFlight(flight);
    devLog('[HOOK] Duplicating flight:', flight.id, '->', cloned.id);
    setFlights((prev) => [...prev, cloned]);
    rememberFlightLookups(cloned);
    toast('Копия билета сохранена', 'success');
  }, [canMutate, rememberFlightLookups]);

  const handleDeleteFlight = useCallback((id: string) => {
    if (!canMutate()) {
      toast('У вас нет прав для удаления билетов. Только просмотр.', 'warning');
      return;
    }
    devLog('[HOOK] Deleting flight');
    setFlights(prev => prev.filter(f => f.id !== id));
  }, [canMutate]);

  const handleRestoreFlight = useCallback((flight: Flight) => {
    if (!canMutate()) return;
    setFlights((prev) => {
      if (prev.some((item) => item.id === flight.id)) return prev;
      return [...prev, flight];
    });
    rememberFlightLookups(flight);
  }, [canMutate, rememberFlightLookups]);

  const handleJoinSession = useCallback(async (token: string) => {
    try {
      devLog('[HOOK] Joining session');
      setLoading(true);
      
      const guestResult = await initGuestMode(token);
      
      if (guestResult) {
        const { guestUser, ownerData } = guestResult;
        if (!ownerData.ok) {
          toast('Не удалось загрузить историю владельца', 'error');
          return;
        }
        
        const userType = getTelegramUserType();
        let displayName: string;
        
        switch (userType) {
          case 'real_telegram': {
            const tgUser = window.Telegram!.WebApp!.initDataUnsafe!.user!;
            displayName = tgUser.first_name || tgUser.username || 'Telegram пользователь';
            break;
          }
            
          case 'anonymous_telegram':
            displayName = `Анонимный гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
            break;
            
          case 'web_browser':
          default:
            displayName = `Веб-гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`;
            break;
        }
        
        applyInitResult({
          userName: displayName,
          userId: guestUser.ownerId,
          appUser: guestUser,
          flights: ownerData.flights,
          airlines: ownerData.airlines,
          originCities: ownerData.originCities,
          destinationCities: ownerData.destinationCities,
        }, true);

        clearTokenFromUrl();
        
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
  }, [applyInitResult]);

  const handleLeaveGuestMode = useCallback(() => {
    try {
      const userType = getTelegramUserType();
      clearTokenFromUrl();
      
      switch (userType) {
        case 'real_telegram':
          setTimeout(() => {
            window.location.reload();
          }, 100);
          break;
          
        case 'anonymous_telegram':
          setTimeout(() => {
            try {
              window.Telegram!.WebApp!.close();
            } catch (closeError) {
              logError('[EXIT] Failed to close WebApp:', closeError);
              window.location.reload();
            }
          }, 100);
          break;
          
        case 'web_browser':
          setTimeout(() => {
            window.location.href = window.location.origin + window.location.pathname;
          }, 100);
          break;
          
        default:
          window.location.reload();
          break;
      }
      
    } catch (error) {
      logError('[EXIT] Error leaving guest mode:', error);
      clearTokenFromUrl();
      window.location.reload();
    }
  }, []);

  return {
    userName,
    userId,
    appUser,
    flights,
    airlines,
    originCities,
    destinationCities,
    loading,
    isCheckingToken,
    saveStatus,
    handleAddFlight,
    handleUpdateFlight,
    handleDuplicateFlight,
    handleDeleteFlight,
    handleRestoreFlight,
    handleJoinSession,
    handleLeaveGuestMode,
    retrySave,
    setActiveTab: () => {},
    setShowShareModal,
  };
};
