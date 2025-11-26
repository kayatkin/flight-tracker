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

  useEffect(() => {
    const saved = localStorage.getItem('flights');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFlights(parsed);
      } catch (e) {
        console.error('Failed to parse flights from localStorage', e);
        setFlights([]);
      }
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('airlines');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAirlines(parsed);
        }
      } catch (e) {
        console.error('Failed to parse airlines from localStorage', e);
        setAirlines([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('flights', JSON.stringify(flights));
  }, [flights]);

  useEffect(() => {
    if (airlines.length > 0) {
      localStorage.setItem('airlines', JSON.stringify(airlines));
    }
  }, [airlines]);

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
          onAdd={(newFlight) => {
            setFlights([...flights, newFlight]);
            if (newFlight.airline && !airlines.includes(newFlight.airline)) {
              setAirlines([...airlines, newFlight.airline]);
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