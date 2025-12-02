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
  const [themeApplied, setThemeApplied] = useState<boolean>(false);

  // 🔧 Функция для применения тем Telegram
  const applyTelegramTheme = (webApp: TelegramWebApp): void => {
    try {
      const themeParams = webApp.themeParams || {};
      
      // Устанавливаем все стандартные переменные Telegram
      document.documentElement.style.setProperty(
        '--tg-theme-bg-color', 
        themeParams.bg_color || '#ffffff'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-text-color', 
        themeParams.text_color || '#000000'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-hint-color', 
        themeParams.hint_color || '#999999'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-link-color', 
        themeParams.link_color || '#2481cc'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-button-color', 
        themeParams.button_color || '#2481cc'
      );
      document.documentElement.style.setProperty(
        '--tg-theme-button-text-color', 
        themeParams.button_text_color || '#ffffff'
      );
      
      // Устанавливаем производные переменные
      document.documentElement.style.setProperty(
        '--tg-bg-color',
        `var(--tg-theme-bg-color, #ffffff)`
      );
      document.documentElement.style.setProperty(
        '--tg-text-color',
        `var(--tg-theme-text-color, #000000)`
      );
      document.documentElement.style.setProperty(
        '--tg-hint-color',
        `var(--tg-theme-hint-color, #888888)`
      );
      document.documentElement.style.setProperty(
        '--tg-link-color',
        `var(--tg-theme-button-color, #0088cc)`
      );
      document.documentElement.style.setProperty(
        '--tg-border-color',
        `var(--tg-theme-hint-color, #e0e0e0)`
      );
      document.documentElement.style.setProperty(
        '--tg-card-bg',
        `var(--tg-theme-bg-color, #ffffff)`
      );
      document.documentElement.style.setProperty(
        '--tg-active-bg',
        `rgba(${hexToRgb(themeParams.button_color || '#0088cc')}, 0.1)`
      );
      
      // Добавляем атрибут для CSS селекторов
      document.documentElement.setAttribute('data-tg-theme', 'loaded');
      
      setThemeApplied(true);
      console.log('[THEME] Telegram theme applied');
    } catch (error) {
      console.error('[THEME] Failed to apply Telegram theme:', error);
      applyDefaultTheme();
    }
  };

  // 🔧 Функция для применения темы по умолчанию
  const applyDefaultTheme = (): void => {
    // Проверяем системную тему
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (isDarkMode) {
      // Темная тема для не-Telegram окружений
      document.documentElement.style.setProperty('--tg-bg-color', '#0f0f0f');
      document.documentElement.style.setProperty('--tg-text-color', '#ffffff');
      document.documentElement.style.setProperty('--tg-hint-color', '#aaaaaa');
      document.documentElement.style.setProperty('--tg-link-color', '#5db0ff');
      document.documentElement.style.setProperty('--tg-border-color', '#333333');
      document.documentElement.style.setProperty('--tg-card-bg', '#1c1c1c');
      document.documentElement.style.setProperty('--tg-active-bg', 'rgba(93, 176, 255, 0.1)');
    } else {
      // Светлая тема по умолчанию
      document.documentElement.style.setProperty('--tg-bg-color', '#ffffff');
      document.documentElement.style.setProperty('--tg-text-color', '#000000');
      document.documentElement.style.setProperty('--tg-hint-color', '#888888');
      document.documentElement.style.setProperty('--tg-link-color', '#0088cc');
      document.documentElement.style.setProperty('--tg-border-color', '#e0e0e0');
      document.documentElement.style.setProperty('--tg-card-bg', '#ffffff');
      document.documentElement.style.setProperty('--tg-active-bg', '#f0f8ff');
    }
    
    document.documentElement.removeAttribute('data-tg-theme');
    setThemeApplied(true);
    console.log('[THEME] Default theme applied');
  };

  // 🔧 Вспомогательная функция для преобразования hex в rgb
  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 136, 204';
  };

  // 🔧 Функция для получения Telegram WebApp
  const getTelegramWebApp = (): TelegramWebApp | null => {
    if (typeof window === 'undefined') return null;
    
    const webApp = window.Telegram?.WebApp;
    
    if (webApp) {
      console.log('[TELEGRAM] WebApp found:', {
        platform: webApp.platform,
        version: webApp.version,
        colorScheme: webApp.colorScheme,
        hasUser: !!webApp.initDataUnsafe?.user,
        themeParams: webApp.themeParams
      });
    }
    
    return webApp || null;
  };

  // 🔧 Функция для получения данных пользователя
  const getTelegramUser = (): {id: string, firstName: string} | null => {
    const webApp = getTelegramWebApp();
    
    if (!webApp) {
      console.log('[TELEGRAM] No WebApp found');
      return null;
    }
    
    if (webApp.initDataUnsafe?.user) {
      const user = webApp.initDataUnsafe.user;
      console.log('[TELEGRAM] User found:', user);
      
      return {
        id: user.id.toString(),
        firstName: user.first_name || user.username || 'Пользователь'
      };
    }
    
    console.log('[TELEGRAM] No user data found');
    return null;
  };

  // 🔧 Функция для создания постоянного development user_id
  const getDevelopmentUserId = (): string => {
    let devUserId = localStorage.getItem('flight_tracker_dev_user_id');
    
    if (!devUserId) {
      devUserId = 'dev_user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('flight_tracker_dev_user_id', devUserId);
      console.log('[DEVELOPMENT] Created new dev user_id:', devUserId);
    } else {
      console.log('[DEVELOPMENT] Using existing dev user_id:', devUserId);
    }
    
    return devUserId;
  };

  // 🔧 Инициализация Telegram WebApp
  const initTelegramWebApp = (webApp: TelegramWebApp): void => {
    try {
      // Инициализируем WebApp
      webApp.ready();
      webApp.expand();
      
      // Применяем тему Telegram
      applyTelegramTheme(webApp);
      
      console.log('[TELEGRAM] WebApp initialized');
    } catch (error) {
      console.error('[TELEGRAM] Failed to initialize:', error);
      applyDefaultTheme();
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
          setIsTelegram(false);
          
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
        applyDefaultTheme();
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
      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <p className={styles.greeting}>
        Привет, <strong>{userName}</strong>!
      </p>

      {/* УДАЛЕН БЛОК С ОТЛАДОЧНОЙ ИНФОРМАЦИЕЙ */}
      {/* Блок с ID пользователя был здесь, теперь удален */}

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('add')}
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.active : ''}`}
        >
          ➕ Добавить перелет
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