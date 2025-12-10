// src/App.tsx - ВТОРОЙ ЭТАП РЕФАКТОРИНГА
import React, { useEffect, useState, useCallback } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import GuestModeIndicator from './components/GuestModeIndicator';
import ShareFlightModal from './components/ShareFlightModal';
import styles from './App.module.css';
import { AppUser } from './types/shared';

// ИМПОРТИРУЕМ СЕРВИСЫ
import { 
  initializeApp, 
  getFallbackInitResult,
  initGuestMode 
} from './services/appInitService';
import { 
  saveOwnerData, 
  saveGuestData 
} from './services/dataService';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('Гость');
  const [userId, setUserId] = useState<string>('');
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destinationCities, setDestinationCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(true);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

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
        console.log('[INIT] App initialization completed');
      }
    };
    
    initApp();
  }, []);
  
  // Автоматическое сохранение в Supabase
  useEffect(() => {
    if (loading || !userId || !appUser) return;
    
    const saveToSupabase = async () => {
      try {
        console.log('[SAVE] Saving data...', { 
          userId, 
          isGuest: appUser.isGuest,
          permissions: appUser.isGuest ? appUser.permissions : 'owner'
        });
        
        if (appUser.isGuest && appUser.permissions === 'edit') {
          await saveGuestData(appUser.ownerId, flights);
          return;
        }
        
        if (!appUser.isGuest) {
          await saveOwnerData(userId, flights, airlines, originCities, destinationCities);
        }
      } catch (err) {
        console.error('[CRITICAL] Save to Supabase crashed:', err);
      }
    };
    
    const timer = setTimeout(saveToSupabase, 2000);
    return () => clearTimeout(timer);
  }, [flights, airlines, originCities, destinationCities, loading, userId, appUser]);
  
  // Обработчик добавления перелета
  const handleAddFlight = useCallback((newFlight: Flight) => {
    const updatedFlights = [...flights, newFlight];
    setFlights(updatedFlights);
    
    // Обновляем авто-заполнения
    if (newFlight.airline && !airlines.includes(newFlight.airline)) {
      setAirlines(prev => [...prev, newFlight.airline]);
    }
    if (newFlight.origin && !originCities.includes(newFlight.origin)) {
      setOriginCities(prev => [...prev, newFlight.origin]);
    }
    if (newFlight.destination && !destinationCities.includes(newFlight.destination)) {
      setDestinationCities(prev => [...prev, newFlight.destination]);
    }
  }, [flights, airlines, originCities, destinationCities]);
  
  // Обработчик удаления перелета
  const handleDeleteFlight = useCallback((id: string) => {
    setFlights(prev => prev.filter(f => f.id !== id));
  }, []);
  
  // Обработчик присоединения по токену
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
        
        // Обновляем URL с токеном
        const newUrl = `${window.location.origin}${window.location.pathname}?token=${token}`;
        window.history.pushState({}, '', newUrl);
        
        alert(`✅ Вы успешно присоединились к истории перелетов!\nПрава: ${guestUser.permissions === 'edit' ? 'Просмотр и редактирование' : 'Только просмотр'}`);
      } else {
        alert('❌ Неверный или просроченный токен доступа');
      }
    } catch (err) {
      console.error('Join session error:', err);
      alert('❌ Ошибка при присоединении к сессии');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Обработчик создания ссылки для общего доступа
  const handleShareCreated = useCallback((token: string) => {
    console.log('Share created with token:', token);
  }, []);
  
  // Обработчик выхода из гостевого режима
  const handleLeaveGuestMode = useCallback(() => {
    window.location.href = window.location.origin + window.location.pathname;
  }, []);
  
  if (loading || isCheckingToken) {
    return (
      <div className={styles.app} style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ 
          fontSize: '16px', 
          color: 'var(--tg-text-color, #000)',
          animation: 'pulse 1.5s infinite'
        }}>
          Загрузка данных...
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.app}>
      {/* Индикатор гостевого режима */}
      {appUser?.isGuest && (
        <GuestModeIndicator
          ownerName={appUser.ownerName || 'Владельца'}
          permissions={appUser.permissions}
          onLeave={handleLeaveGuestMode}
        />
      )}

      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <p className={styles.greeting}>
        Привет, <strong>{userName}</strong>!
      </p>

      {/* Модальное окно для создания ссылки */}
      {showShareModal && appUser && !appUser.isGuest && (
        <ShareFlightModal
          userId={appUser.userId}
          onClose={() => setShowShareModal(false)}
          onShareCreated={handleShareCreated}
        />
      )}

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('add')}
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.active : ''}`}
          disabled={appUser?.isGuest && appUser.permissions === 'view'}
        >
          {appUser?.isGuest && appUser.permissions === 'view' ? '👁️ Добавить перелет' : '➕ Добавить перелет'}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
        >
          📚 История
        </button>
      </div>

      {activeTab === 'add' && (
        <AddFlightForm
          flights={flights}
          airlines={airlines}
          originCities={originCities}
          destinationCities={destinationCities}
          onAdd={handleAddFlight}
          onNavigateToHistory={() => setActiveTab('history')}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView 
          flights={flights} 
          onDelete={handleDeleteFlight}
          onShare={() => setShowShareModal(true)}
          onJoin={handleJoinSession}
          userId={appUser?.userId}
          isGuest={appUser?.isGuest || false}
          guestPermissions={appUser?.isGuest ? appUser.permissions : undefined}
        />
      )}
      
      {/* CSS для анимации загрузки */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default App;