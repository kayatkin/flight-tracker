// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import styles from './App.module.css';
import { supabase } from './lib/supabaseClient';

// Типы для Telegram WebApp
interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    auth_date?: string;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: string;
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  MainButton: any;
  BackButton: any;
  SettingsButton: any;
  HapticFeedback: any;
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (eventType: string, eventHandler: Function) => void;
  offEvent: (eventType: string, eventHandler: Function) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('Гость');
  const [userId, setUserId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destinationCities, setDestinationCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTelegram, setIsTelegram] = useState<boolean>(false);

  // 🔧 Простая функция для получения Telegram WebApp
  const getTelegramWebApp = (): TelegramWebApp | null => {
    if (typeof window === 'undefined') return null;
    
    // Прямой доступ к Telegram WebApp
    const webApp = window.Telegram?.WebApp;
    
    if (webApp) {
      console.log('[TELEGRAM] WebApp found:', {
        platform: webApp.platform,
        version: webApp.version,
        hasUser: !!webApp.initDataUnsafe?.user
      });
    } else {
      console.log('[TELEGRAM] WebApp not found');
    }
    
    return webApp || null;
  };

  // 🔧 Функция для получения данных пользователя
  const getTelegramUser = (): {id: string, firstName: string} | null => {
    const webApp = getTelegramWebApp();
    
    if (!webApp) {
      return null;
    }
    
    // Получаем пользователя из initDataUnsafe
    if (webApp.initDataUnsafe?.user) {
      const user = webApp.initDataUnsafe.user;
      console.log('[TELEGRAM] User found:', user);
      
      return {
        id: user.id.toString(),
        firstName: user.first_name || user.username || 'Пользователь'
      };
    }
    
    return null;
  };

  // 🔧 Функция для создания постоянного development user_id
  const getDevelopmentUserId = (): string => {
    // Пробуем получить из localStorage
    let devUserId = localStorage.getItem('flight_tracker_dev_user_id');
    
    if (!devUserId) {
      // Создаем новый постоянный ID
      devUserId = 'dev_user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('flight_tracker_dev_user_id', devUserId);
      console.log('[DEVELOPMENT] Created new dev user_id:', devUserId);
    } else {
      console.log('[DEVELOPMENT] Using existing dev user_id:', devUserId);
    }
    
    return devUserId;
  };

  // 🔧 Инициализация Telegram WebApp и применение темы
  const initTelegramWebApp = (webApp: TelegramWebApp): void => {
    try {
      // Применяем тему из Telegram
      const themeParams = webApp.themeParams || {};
      document.documentElement.style.setProperty('--tg-bg-color', themeParams.bg_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-text-color', themeParams.text_color || '#000000');
      document.documentElement.style.setProperty('--tg-hint-color', themeParams.hint_color || '#999999');
      document.documentElement.style.setProperty('--tg-link-color', themeParams.link_color || '#2481cc');

      // Инициализируем WebApp
      webApp.ready();
      webApp.expand();
      
      console.log('[TELEGRAM] WebApp initialized with theme');
    } catch (error) {
      console.error('[TELEGRAM] Failed to initialize:', error);
      // Fallback тема
      document.documentElement.style.setProperty('--tg-bg-color', '#ffffff');
      document.documentElement.style.setProperty('--tg-text-color', '#000000');
    }
  };

  // Инициализация приложения
  useEffect(() => {
    const initApp = async () => {
      try {
        console.log('[INIT] Starting app initialization...');
        
        // Ждем немного для загрузки Telegram WebApp
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const webApp = getTelegramWebApp();
        let currentUserId: string;
        let currentUserName: string;
        let telegramDetected = false;
        
        if (webApp) {
          console.log('[INIT] Telegram WebApp detected!');
          telegramDetected = true;
          setIsTelegram(true);
          
          // Инициализируем Telegram WebApp с темой
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
          // Development mode — светлая тема по умолчанию
          console.log('[INIT] Development mode detected');
          telegramDetected = false;
          setIsTelegram(false);
          
          // Устанавливаем светлую тему для локальной разработки
          document.documentElement.style.setProperty('--tg-bg-color', '#ffffff');
          document.documentElement.style.setProperty('--tg-text-color', '#000000');
          document.documentElement.style.setProperty('--tg-hint-color', '#999999');
          document.documentElement.style.setProperty('--tg-link-color', '#2481cc');
          
          currentUserId = getDevelopmentUserId();
          currentUserName = 'Разработчик';
          console.log('[INIT] Using development user:', { 
            id: currentUserId, 
            name: currentUserName 
          });
        }
        
        setUserId(currentUserId);
        setUserName(currentUserName);
        
        // Загружаем данные из Supabase
        console.log('[SUPABASE] Loading data for user_id:', currentUserId);
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('[SUPABASE] Load error:', error);
        } else if (data) {
          console.log('[SUPABASE] Data loaded:', {
            flights: data.flights?.length || 0,
            airlines: data.airlines?.length || 0
          });
          setFlights(data.flights || []);
          setAirlines(data.airlines || []);
          setOriginCities(data.origin_cities || []);
          setDestinationCities(data.destination_cities || []);
        } else {
          console.log('[SUPABASE] No data found for this user');
          setFlights([]);
          setAirlines([]);
          setOriginCities([]);
          setDestinationCities([]);
        }
        
      } catch (err) {
        console.error('[CRITICAL] App initialization crashed:', err);
        // Fallback тема и данные
        document.documentElement.style.setProperty('--tg-bg-color', '#ffffff');
        document.documentElement.style.setProperty('--tg-text-color', '#000000');
        setUserName('Гость');
        setUserId('error_user');
        setFlights([]);
        setAirlines([]);
        setOriginCities([]);
        setDestinationCities([]);
      } finally {
        setLoading(false);
        console.log('[INIT] App initialization completed');
      }
    };
    
    initApp();
  }, []);
  
  // Автоматическое сохранение в Supabase
  useEffect(() => {
    if (loading || !userId) return;
    
    const saveToSupabase = async () => {
      try {
        console.log('[SUPABASE] Saving data for user:', userId);
        
        const { error } = await supabase.from('flights').upsert(
          {
            user_id: userId,
            flights: flights,
            airlines: airlines,
            origin_cities: originCities,
            destination_cities: destinationCities,
            updated_at: new Date().toISOString(),
          },
          { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          }
        );
        
        if (error) {
          console.error('[SUPABASE] Save error:', error);
        } else {
          console.log('[SUPABASE] Data saved successfully');
        }
      } catch (err) {
        console.error('[CRITICAL] Save to Supabase crashed:', err);
      }
    };
    
    const timer = setTimeout(saveToSupabase, 2000);
    return () => clearTimeout(timer);
  }, [flights, airlines, originCities, destinationCities, loading, userId]);
  
  if (loading) {
    return (
      <div className={styles.app} style={{ textAlign: 'center', padding: '40px' }}>
        <p>Загрузка данных...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.app}>
      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <p className={styles.greeting}>
        Привет, <strong>{userName}</strong>!
      </p>
      <p style={{ fontSize: '12px', color: 'var(--tg-hint-color)', marginTop: '-8px' }}>
        Ваш user_id: {userId}
      </p>
      
      {/* Информация о режиме */}
      <div style={{ 
        fontSize: '10px', 
        color: isTelegram ? 'var(--tg-link-color)' : 'orange', 
        marginTop: '5px',
        padding: '5px',
        backgroundColor: 'var(--tg-bg-color)',
        borderRadius: '4px',
        border: `1px solid ${isTelegram ? 'var(--tg-link-color)' : 'orange'}`,
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
        <span>{isTelegram ? '✅' : '🛠️'}</span>
        <span>
          {isTelegram ? `Telegram Mini App Mode` : 'Development Mode'}
        </span>
      </div>
      
      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('add')}
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.active : ''}`}
        >
          ➕ Добавить
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
          onAdd={(newFlight) => {
            const updatedFlights = [...flights, newFlight];
            setFlights(updatedFlights);
            
            if (newFlight.airline && !airlines.includes(newFlight.airline)) {
              setAirlines([...airlines, newFlight.airline]);
            }
            if (newFlight.origin && !originCities.includes(newFlight.origin)) {
              setOriginCities([...originCities, newFlight.origin]);
            }
            if (newFlight.destination && !destinationCities.includes(newFlight.destination)) {
              setDestinationCities([...destinationCities, newFlight.destination]);
            }
          }}
        />
      )}
      
      {activeTab === 'history' && (
        <HistoryView 
          flights={flights} 
          onDelete={(id) => setFlights(flights.filter(f => f.id !== id))} 
        />
      )}
    </div>
  );
};

export default App;