// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Flight } from './types';

// Импорт компонентов
import AddFlightForm from './components/AddFlightForm';
import HistoryView from './components/HistoryView';

// Попытка импорта Telegram SDK
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
  const [airlines, setAirlines] = useState<string[]>([]); // ← добавлено

  // Загрузка сохранённых билетов
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

  // Загрузка сохранённых авиакомпаний
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

  // Сохранение билетов
  useEffect(() => {
    localStorage.setItem('flights', JSON.stringify(flights));
  }, [flights]);

  // Сохранение авиакомпаний
  useEffect(() => {
    if (airlines.length > 0) {
      localStorage.setItem('airlines', JSON.stringify(airlines));
    }
  }, [airlines]);

  // Определение имени пользователя
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
    <div
      style={{
        padding: '16px',
        fontFamily: 'sans-serif',
        maxWidth: '500px',
        margin: '0 auto',
      }}
    >
      <h2>✈️ Flight Tracker</h2>
      <p>
        Привет, <strong>{userName}</strong>!
      </p>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setActiveTab('add')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            backgroundColor: activeTab === 'add' ? '#e6f2ff' : 'white',
            cursor: 'pointer',
          }}
        >
          ➕ Добавить
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '6px',
            backgroundColor: activeTab === 'history' ? '#e6f2ff' : 'white',
            cursor: 'pointer',
          }}
        >
          📚 История
        </button>
      </div>

      {activeTab === 'add' && (
        <AddFlightForm
          flights={flights}
          airlines={airlines} // ← передаём
          onAdd={(newFlight) => {
            setFlights([...flights, newFlight]);
            // Добавляем авиакомпанию, если новая
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