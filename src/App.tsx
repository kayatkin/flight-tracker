// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import styles from './App.module.css';
import { supabase } from './lib/supabaseClient';

let retrieveLaunchParams: () => any = () => ({});
try {
  const sdk = require('@telegram-apps/sdk');
  retrieveLaunchParams = sdk.retrieveLaunchParams;
} catch (e) {
  console.warn('Telegram SDK not available — using fallback');
}

const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('Гость');
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airlines, setAirlines] = useState<string[]>([]);
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destinationCities, setDestinationCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Инициализация пользователя и загрузка данных
  useEffect(() => {
    const initUserAndLoadData = async () => {
      let userId: string | null = null;
      let userFirstName = 'Гость';

      try {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
          const launchParams = retrieveLaunchParams();
          const user = launchParams?.initData?.user;
          userId = user?.id?.toString() || null;
          userFirstName = user?.first_name || 'Друг';
          console.log('[DEBUG] Telegram user detected:', { id: userId, name: userFirstName });
        } else {
          userId = 'dev_user_123';
          userFirstName = 'Разработчик';
          console.log('[DEBUG] Local dev mode (not in Telegram)');
        }

        setUserName(userFirstName);

        if (!userId) {
          console.warn('[DEBUG] No user ID, skipping Supabase load');
          setLoading(false);
          return;
        }

        console.log('[DEBUG] Loading data from Supabase for user_id:', userId);
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .eq('user_id', userId)
          .single();

        console.log('[DEBUG] Supabase load result:', { data, error });

        if (error && error.code !== 'PGRST116') {
          console.error('[ERROR] Supabase load failed:', error);
          setLoading(false);
          return;
        }

        if (data) {
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

  // Автоматическое сохранение в Supabase (с debounce)
  useEffect(() => {
    if (loading) return;

    const saveToSupabase = async () => {
      let userId: string | null = null;

      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const launchParams = retrieveLaunchParams();
        userId = launchParams?.initData?.user?.id?.toString() || null;
      } else {
        userId = 'dev_user_123';
      }

      if (!userId) {
        console.warn('[DEBUG] No user ID, skipping save');
        return;
      }

      console.log('[DEBUG] Saving to Supabase for user_id:', userId);
      console.log('[DEBUG] Data to save:', {
        flightsCount: flights.length,
        airlines,
        originCities,
        destinationCities,
      });

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
          console.log('[DEBUG] Data saved successfully to Supabase');
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

  return (
    <div className={styles.app}>
      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <p className={styles.greeting}>
        Привет, <strong>{userName}</strong>!
      </p>
      <p style={{ fontSize: '12px', color: '#888', marginTop: '-8px' }}>
      Ваш user_id: {window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'не определён'}
      </p>
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