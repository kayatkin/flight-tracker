// src\shared\hooks\useFlightTracker.ts
import { useState, useCallback, useEffect } from 'react';
import { Flight } from '../../shared/types';
import { AppUser } from '../../shared/types';
import { initializeApp, getFallbackInitResult, initGuestMode } from '../../services/appInitService';
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
  // УДАЛЕНО: const [showShareModal, setShowShareModal] = useState<boolean>(false);
  // Заменено на:
  const setShowShareModal = useCallback((_show: boolean) => {
    // Реализация будет в App.tsx, здесь это заглушка
  }, []);

  // Инициализация приложения
  useEffect(() => {
    const initApp = async () => {
      try {
        const initResult = await initializeApp();
        
        setUserName(initResult.userName);
        setUserId(initResult.userId);
        setAppUser(initResult.appUser);
        setFlights(initResult.flights);
        setAirlines(initResult.airlines);
        setOriginCities(initResult.originCities);
        setDestinationCities(initResult.destinationCities);
      } catch (err) {
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

  // Автосохранение
  useEffect(() => {
    if (loading || !userId || !appUser) return;
    
    const saveData = async () => {
      try {
        if (appUser.isGuest && appUser.permissions === 'edit') {
          await saveGuestData(appUser.ownerId, flights);
        } else if (!appUser.isGuest) {
          await saveOwnerData(userId, flights, airlines, originCities, destinationCities);
        }
      } catch (err) {
        console.error('[SAVE] Error:', err);
      }
    };
    
    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [flights, airlines, originCities, destinationCities, loading, userId, appUser]);

  // Обработчики
  const handleAddFlight = useCallback((newFlight: Flight) => {
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
    setFlights(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleJoinSession = useCallback(async (token: string) => {
    try {
      setLoading(true);
      const guestResult = await initGuestMode(token);
      
      if (guestResult) {
        const { guestUser, ownerData } = guestResult;
        
        setAppUser(guestUser);
        setUserId(guestUser.ownerId);
        setUserName(`Гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`);
        setFlights(ownerData.flights);
        setAirlines(ownerData.airlines);
        setOriginCities(ownerData.originCities);
        setDestinationCities(ownerData.destinationCities);
        
        const newUrl = `${window.location.origin}${window.location.pathname}?token=${token}`;
        window.history.pushState({}, '', newUrl);
        
        alert(`✅ Вы успешно присоединились!\nПрава: ${guestUser.permissions === 'edit' ? 'Редактирование' : 'Просмотр'}`);
      } else {
        alert('❌ Неверный или просроченный токен');
      }
    } catch (err) {
      console.error('Join error:', err);
      alert('❌ Ошибка при присоединении');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLeaveGuestMode = useCallback(() => {
    window.location.href = window.location.origin + window.location.pathname;
  }, []);

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
    setActiveTab: () => {}, // Будет переопределено в App.tsx
    setShowShareModal,
  };
};