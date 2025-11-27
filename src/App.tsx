// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Flight } from './types';
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';
import styles from './App.module.css';

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

  // Загрузка данных из localStorage
  useEffect(() => {
    const load = (key: string): any[] => {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error(`Failed to parse ${key} from localStorage`, e);
        }
      }
      return [];
    };

    setFlights(load('flights'));
    setAirlines(load('airlines'));
    setOriginCities(load('originCities'));
    setDestinationCities(load('destinationCities'));
  }, []);

  // Сохранение в localStorage
  useEffect(() => localStorage.setItem('flights', JSON.stringify(flights)), [flights]);
  useEffect(() => localStorage.setItem('airlines', JSON.stringify(airlines)), [airlines]);
  useEffect(() => localStorage.setItem('originCities', JSON.stringify(originCities)), [originCities]);
  useEffect(() => localStorage.setItem('destinationCities', JSON.stringify(destinationCities)), [destinationCities]);

  // Инициализация имени пользователя
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const launchParams = retrieveLaunchParams();
        const user = launchParams?.initData?.user;
        setUserName(user?.first_name || 'Друг');
      } else {
        setUserName('Разработчик');
      }
    } catch (err) {
      setUserName('Разработчик');
    }
  }, []);

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
            // Обновление списков
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