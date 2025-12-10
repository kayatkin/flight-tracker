// src/App.tsx - ПЕРВЫЙ ЭТАП РЕФАКТОРИНГА
import React, { useEffect, useState } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import GuestModeIndicator from './components/GuestModeIndicator';
import ShareFlightModal from './components/ShareFlightModal';
import styles from './App.module.css';
import { GuestUser, AppUser } from './types/shared';

// ИМПОРТИРУЕМ ВЫНЕСЕННЫЕ ФУНКЦИИ
import { 
  getTelegramWebApp, 
  getTelegramUser, 
  getDevelopmentUserId, 
  initTelegramWebApp,
  applyDefaultTheme,
} from './utils';

// ИМПОРТИРУЕМ СЕРВИС ДАННЫХ
import { 
  validateToken, 
  loadUserData, 
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
        console.log('[INIT] Starting app initialization...');
        
        // Ждем немного для загрузки Telegram WebApp
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Проверяем токен в URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
          console.log('[INIT] Token found in URL, checking...');
          const guestUser = await validateToken(token);
          
          if (guestUser) {
            console.log('[INIT] Valid guest user:', guestUser);
            setAppUser(guestUser);
            
            // Загружаем данные владельца
            const ownerData = await loadUserData(guestUser.ownerId);
            setUserId(guestUser.ownerId);
            setUserName(`Гость (${guestUser.permissions === 'edit' ? 'редактирование' : 'просмотр'})`);
            setFlights(ownerData.flights);
            setAirlines(ownerData.airlines);
            setOriginCities(ownerData.originCities);
            setDestinationCities(ownerData.destinationCities);
            applyDefaultTheme();
            setIsCheckingToken(false);
            setLoading(false);
            return;
          } else {
            console.log('[INIT] Invalid or expired token');
            // Удаляем невалидный токен из URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        }

        // Оригинальная инициализация для владельца
        const webApp = getTelegramWebApp();
        let currentUserId: string;
        let currentUserName: string;
        let telegramDetected = false;
        
        if (webApp) {
          console.log('[INIT] Telegram WebApp detected!');
          telegramDetected = true;
          
          // Инициализируем Telegram WebApp
          initTelegramWebApp(webApp);
          
          // Получаем данные пользователя
          const telegramUser = getTelegramUser();
          
          if (telegramUser) {
            currentUserId = telegramUser.id;
            currentUserName = telegramUser.firstName;
            console.log('[INIT] Using Telegram user:', { 
              id: currentUserId, 
              name: currentUserName 
            });
            
            // Добавляем префикс для идентификации
            currentUserId = 'tg_' + currentUserId;
          } else {
            // Если в Telegram, но нет данных пользователя
            currentUserId = 'telegram_anon_' + Math.random().toString(36).substr(2, 8);
            currentUserName = 'Аноним';
            console.log('[INIT] Using anonymous Telegram user:', currentUserId);
          }
        } else {
          // Development mode
          console.log('[INIT] Development mode detected');
          telegramDetected = false;
          
          // Применяем тему по умолчанию
          applyDefaultTheme();
          
          currentUserId = getDevelopmentUserId();
          currentUserName = 'Разработчик';
          console.log('[INIT] Using development user:', { 
            id: currentUserId, 
            name: currentUserName 
          });
        }
        
        setUserId(currentUserId);
        setUserName(currentUserName);
        
        // Устанавливаем appUser как владельца
        setAppUser({
          userId: currentUserId,
          name: currentUserName,
          isGuest: false,
          isTelegram: telegramDetected
        });
        
        // Загружаем данные пользователя
        const userData = await loadUserData(currentUserId);
        setFlights(userData.flights);
        setAirlines(userData.airlines);
        setOriginCities(userData.originCities);
        setDestinationCities(userData.destinationCities);
        
      } catch (err) {
        console.error('[CRITICAL] App initialization crashed:', err);
        // Fallback тема и данные
        applyDefaultTheme();
        setUserName('Гость');
        setUserId('error_user');
        setFlights([]);
        setAirlines([]);
        setOriginCities([]);
        setDestinationCities([]);
        setAppUser({
          userId: 'error_user',
          name: 'Гость',
          isGuest: false,
          isTelegram: false
        });
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
        
        // Если это гость с правами редактирования
        if (appUser.isGuest && appUser.permissions === 'edit') {
          await saveGuestData(appUser.ownerId, flights);
          return;
        }
        
        // Оригинальное сохранение для владельца
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
  const handleAddFlight = (newFlight: Flight) => {
    const updatedFlights = [...flights, newFlight];
    setFlights(updatedFlights);
    
    // Обновляем авто-заполнения
    if (newFlight.airline && !airlines.includes(newFlight.airline)) {
      setAirlines([...airlines, newFlight.airline]);
    }
    if (newFlight.origin && !originCities.includes(newFlight.origin)) {
      setOriginCities([...originCities, newFlight.origin]);
    }
    if (newFlight.destination && !destinationCities.includes(newFlight.destination)) {
      setDestinationCities([...destinationCities, newFlight.destination]);
    }
  };
  
  // Обработчик удаления перелета
  const handleDeleteFlight = (id: string) => {
    setFlights(flights.filter(f => f.id !== id));
  };
  
  // Обработчик присоединения по токену (передается в HistoryView)
  const handleJoinSession = async (token: string) => {
    try {
      setLoading(true);
      const guestUser = await validateToken(token);
      
      if (guestUser) {
        setAppUser(guestUser);
        
        // Загружаем данные владельца
        const ownerData = await loadUserData(guestUser.ownerId);
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
  };
  
  // Обработчик создания ссылки для общего доступа
  const handleShareCreated = (token: string) => {
    console.log('Share created with token:', token);
    // Можно показать уведомление или обновить интерфейс
  };
  
  // Обработчик выхода из гостевого режима
  const handleLeaveGuestMode = () => {
    window.location.href = window.location.origin + window.location.pathname;
  };
  
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