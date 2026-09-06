// src/App.tsx
import React, { useState, useEffect } from 'react';
import { AddFlightForm } from '@features/flights';
import { HistoryView } from '@features/flights';
import { GuestModeIndicator } from '@features/guest-mode';
import { ShareFlightModal } from '@features/sharing';
import styles from './App.module.css';

// Кастомный хук
import { useFlightTracker } from './hooks';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  
  const {
    // Состояния
    userName,
    userId, // Добавлено: получаем userId из хука
    appUser,
    flights,
    airlines,
    originCities,
    destinationCities,
    loading,
    isCheckingToken,
    
    // Обработчики
    handleAddFlight,
    handleDeleteFlight,
    handleJoinSession,
    handleLeaveGuestMode,
  } = useFlightTracker();

  const isViewGuest = Boolean(appUser?.isGuest && appUser.permissions === 'view');

  useEffect(() => {
    if (isViewGuest) {
      setActiveTab('history');
    }
  }, [isViewGuest]);

  if (loading || isCheckingToken) {
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
      {/* Индикатор гостевого режима */}
      {appUser?.isGuest && (
        <GuestModeIndicator
          ownerName={appUser.ownerName || 'Владельца'}
          permissions={appUser.permissions}
          onLeave={handleLeaveGuestMode}
        />
      )}

      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <p className={styles.greeting}>
        Привет, <strong>{userName}</strong>!
      </p>

      {/* Модальное окно для создания ссылки */}
      {showShareModal && appUser && !appUser.isGuest && (
        <ShareFlightModal
          userId={appUser.userId}
          onClose={() => setShowShareModal(false)}
          onShareCreated={() => {}}
        />
      )}

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab('add')}
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.active : ''}`}
          disabled={isViewGuest}
        >
          {appUser?.isGuest && appUser.permissions === 'view' ? '👁️ Добавить перелет' : '➕ Добавить перелет'}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
        >
          📚 История
        </button>
      </div>

      {activeTab === 'add' && !isViewGuest && (
        <AddFlightForm
          flights={flights}
          airlines={airlines}
          originCities={originCities}
          destinationCities={destinationCities}
          onAdd={handleAddFlight}
          onNavigateToHistory={() => setActiveTab('history')}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView 
          flights={flights} 
          onDelete={handleDeleteFlight}
          onShare={() => setShowShareModal(true)}
          onJoin={handleJoinSession}
          userId={appUser?.userId || userId} // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: используем userId из хука как fallback
          isGuest={appUser?.isGuest || false}
          guestPermissions={appUser?.isGuest ? appUser.permissions : undefined}
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