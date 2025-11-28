// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import styles from './App.module.css';
import { supabase } from './lib/supabaseClient';

// Инициализация WebApp
let WebApp: any = null;

if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  WebApp = (window as any).Telegram.WebApp;
  WebApp.ready(); // 🔑 ГЛАВНОЕ: сообщаем Telegram, что приложение готово
  WebApp.expand(); // 📱 Раскрываем на весь экран
}

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('Гость');
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destinationCities, setDestinationCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔧 ПРАВИЛЬНАЯ функция парсинга initData
  const parseInitData = () => {
    if (!WebApp?.initData) return null;
    
    try {
      // Парсим строку параметров URL (например: "user=...&auth_date=...")
      const urlParams = new URLSearchParams(WebApp.initData);
      const userParam = urlParams.get('user');
      
      if (userParam) {
        const user = JSON.parse(decodeURIComponent(userParam));
        console.log('[DEBUG] Parsed user data:', user);
        return user;
      }
    } catch (error) {
      console.error('[ERROR] Failed to parse initData:', error);
    }
    
    return null;
  };

  // 🔧 ПРАВИЛЬНАЯ функция получения user_id
  const getUserId = () => {
    // Способ 1: Через initDataUnsafe (самый простой)
    if (WebApp?.initDataUnsafe?.user) {
      const userId = WebApp.initDataUnsafe.user.id;
      console.log('[DEBUG] User ID from initDataUnsafe:', userId);
      return userId.toString();
    }
    
    // Способ 2: Через парсинг initData
    const user = parseInitData();
    if (user?.id) {
      console.log('[DEBUG] User ID from parsed initData:', user.id);
      return user.id.toString();
    }
    
    // Способ 3: Режим разработки
    console.log('[DEBUG] Using dev user ID');
    return 'dev_user_' + Date.now();
  };

  // 🔧 ПРАВИЛЬНАЯ функция получения имени пользователя
  const getUserName = () => {
    // Способ 1: Через initDataUnsafe
    if (WebApp?.initDataUnsafe?.user) {
      return WebApp.initDataUnsafe.user.first_name || 'Друг';
    }
    
    // Способ 2: Через парсинг initData
    const user = parseInitData();
    if (user?.first_name) {
      return user.first_name;
    }
    
    return 'Гость';
  };

  // Инициализация пользователя и загрузка данных
  useEffect(() => {
    const initUserAndLoadData = async () => {
      try {
        const userId = getUserId();
        const userFirstName = getUserName();

        console.log('[DEBUG] Final user info:', {
          id: userId,
          name: userFirstName,
          hasWebApp: !!WebApp,
          initData: WebApp?.initData ? 'exists' : 'missing',
          initDataUnsafe: WebApp?.initDataUnsafe ? 'exists' : 'missing'
        });

        setUserName(userFirstName);

        // Загружаем данные из Supabase
        console.log('[DEBUG] Loading data from Supabase for user_id:', userId);
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .eq('user_id', userId)
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
        console.error('[CRITICAL] Init user/load data crashed:', err);
        setUserName('Ошибка');
      } finally {
        setLoading(false);
      }
    };

    initUserAndLoadData();
  }, []);

  // Автоматическое сохранение в Supabase
  useEffect(() => {
    if (loading) return;

    const saveToSupabase = async () => {
      const userId = getUserId();

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
  }, [flights, airlines, originCities, destinationCities, loading]);

  if (loading) {
    return (
      <div className={styles.app} style={{ textAlign: 'center', padding: '40px' }}>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  // 🔧 ПРАВИЛЬНОЕ отображение user_id
  const displayUserId = () => {
    const userId = getUserId();
    return userId.startsWith('dev_user_') ? 'не определён (режим разработки)' : userId;
  };

  return (
    <div className={styles.app}>
      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <p className={styles.greeting}>
        Привет, <strong>{userName}</strong>!
      </p>
      <p style={{ fontSize: '12px', color: '#888', marginTop: '-8px' }}>
        Ваш user_id: {displayUserId()}
      </p>
      
      {/* Отладочная информация */}
      <div style={{ fontSize: '10px', color: '#ccc', marginTop: '5px' }}>
        {WebApp ? `Telegram Web App v${WebApp.version}` : 'Not in Telegram'}
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