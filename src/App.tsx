// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import styles from './App.module.css';
import { supabase } from './lib/supabaseClient';

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('Гость');
  const [userId, setUserId] = useState<string>('не определён');
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destinationCities, setDestinationCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTelegram, setIsTelegram] = useState<boolean>(false);

  // 🔧 Функция для получения Telegram WebApp
  const getTelegramWebApp = () => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      return (window as any).Telegram.WebApp;
    }
    return null;
  };

  // 🔧 Функция для получения данных пользователя из Telegram
  const getTelegramUser = () => {
    const webApp = getTelegramWebApp();
    
    if (!webApp) {
      console.log('[DEBUG] Telegram WebApp not found');
      return null;
    }

    console.log('[DEBUG] Telegram WebApp found:', {
      version: webApp.version,
      platform: webApp.platform,
      initData: webApp.initData ? 'exists' : 'missing',
      initDataUnsafe: webApp.initDataUnsafe ? 'exists' : 'missing'
    });

    // Способ 1: Через initDataUnsafe (самый простой)
    if (webApp.initDataUnsafe?.user) {
      const user = webApp.initDataUnsafe.user;
      console.log('[DEBUG] User from initDataUnsafe:', user);
      return {
        id: user.id.toString(),
        firstName: user.first_name || 'Друг',
        source: 'initDataUnsafe'
      };
    }

    // Способ 2: Через парсинг initData строки
    if (webApp.initData) {
      try {
        const urlParams = new URLSearchParams(webApp.initData);
        const userParam = urlParams.get('user');
        
        if (userParam) {
          const user = JSON.parse(decodeURIComponent(userParam));
          console.log('[DEBUG] User from initData parsing:', user);
          return {
            id: user.id.toString(),
            firstName: user.first_name || 'Друг',
            source: 'initData'
          };
        }
      } catch (error) {
        console.error('[ERROR] Failed to parse initData:', error);
      }
    }

    console.log('[DEBUG] No user data found in Telegram WebApp');
    return null;
  };

  // Инициализация приложения
  useEffect(() => {
    const initApp = async () => {
      try {
        const webApp = getTelegramWebApp();
        
        if (webApp) {
          // Инициализируем Telegram WebApp
          webApp.ready();
          webApp.expand();
          setIsTelegram(true);
          console.log('[DEBUG] Telegram WebApp initialized');
        } else {
          console.log('[DEBUG] Running in non-Telegram environment');
          setIsTelegram(false);
        }

        // Получаем данные пользователя
        const telegramUser = getTelegramUser();
        let currentUserId: string;
        let currentUserName: string;

        if (telegramUser) {
          currentUserId = telegramUser.id;
          currentUserName = telegramUser.firstName;
          console.log('[DEBUG] Using Telegram user:', { id: currentUserId, name: currentUserName });
        } else {
          currentUserId = 'dev_user_' + Date.now();
          currentUserName = 'Разработчик';
          console.log('[DEBUG] Using development user:', { id: currentUserId, name: currentUserName });
        }

        setUserId(currentUserId);
        setUserName(currentUserName);

        // Загружаем данные из Supabase
        console.log('[DEBUG] Loading data from Supabase for user_id:', currentUserId);
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('[ERROR] Supabase load failed:', error);
        } else if (data) {
          console.log('[DEBUG] Data loaded successfully from Supabase');
          setFlights(data.flights || []);
          setAirlines(data.airlines || []);
          setOriginCities(data.origin_cities || []);
          setDestinationCities(data.destination_cities || []);
        } else {
          console.log('[DEBUG] No data found in Supabase for this user');
        }

      } catch (err) {
        console.error('[CRITICAL] App initialization crashed:', err);
        setUserName('Ошибка');
        setUserId('error');
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Автоматическое сохранение в Supabase
  useEffect(() => {
    if (loading) return;

    const saveToSupabase = async () => {
      try {
        const { error } = await supabase.from('flights').upsert(
          {
            user_id: userId,
            flights,
            airlines,
            origin_cities: originCities,
            destination_cities: destinationCities,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          console.error('[ERROR] Supabase save failed:', error);
        } else {
          console.log('[DEBUG] Data saved successfully to Supabase for user:', userId);
        }
      } catch (err) {
        console.error('[CRITICAL] Save to Supabase crashed:', err);
      }
    };

    const timer = setTimeout(saveToSupabase, 1000);
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
      <p style={{ fontSize: '12px', color: '#888', marginTop: '-8px' }}>
        Ваш user_id: {userId}
      </p>
      
      {/* Отладочная информация */}
      <div style={{ fontSize: '10px', color: '#ccc', marginTop: '5px' }}>
        {isTelegram ? `Telegram Web App - User ID: ${userId}` : 'Not in Telegram - Development Mode'}
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
            setFlights([...flights, newFlight]);
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