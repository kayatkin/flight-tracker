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

  // Загрузка сохранённых билетов из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('flights');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Опционально: можно добавить валидацию структуры, но для MVP — достаточно
        setFlights(parsed);
      } catch (e) {
        console.error('Failed to parse flights from localStorage', e);
        setFlights([]);
      }
    }
  }, []);

  // Сохранение билетов при изменении
  useEffect(() => {
    localStorage.setItem('flights', JSON.stringify(flights));
  }, [flights]);

  // Определение имени пользователя (Telegram или локальная разработка)
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
          onAdd={(newFlight) => setFlights([...flights, newFlight])}
        />
      )}

      {activeTab === 'history' && <HistoryView flights={flights} />}
    </div>
  );
};

export default App;