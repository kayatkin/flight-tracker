// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import styles from './App.module.css';
import { supabase } from './lib/supabaseClient'; // ← создаём этот файл отдельно

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
        // Проверяем, запущено ли в Telegram
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
          const launchParams = retrieveLaunchParams();
          const user = launchParams?.initData?.user;
          userId = user?.id?.toString() || null;
          userFirstName = user?.first_name || 'Друг';
        } else {
          // Локальная разработка — фиксированный ID
          userId = 'dev_user_123';
          userFirstName = 'Разработчик';
        }

        setUserName(userFirstName);

        if (!userId) {
          setLoading(false);
          return;
        }

        // Загружаем данные из Supabase
        const { data, error } = await supabase
          .from('flights')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 = "no rows returned", это нормально
          console.error('Supabase load error:', error);
          setLoading(false);
          return;
        }

        if (data) {
          setFlights(data.flights || []);
          setAirlines(data.airlines || []);
          setOriginCities(data.origin_cities || []);
          setDestinationCities(data.destination_cities || []);
        }
      } catch (err) {
        console.error('Init error:', err);
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

      if (!userId) return;

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
          console.error('Supabase save error:', error);
        }
      } catch (err) {
        console.error('Save failed:', err);
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