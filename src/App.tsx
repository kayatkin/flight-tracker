import React, { useState, useEffect, useMemo } from 'react';
import { AddFlightForm } from '@features/flights';
import { HistoryView } from '@features/flights';
import { GuestModeIndicator } from '@features/guest-mode';
import { ShareFlightModal } from '@features/sharing';
import { Flight } from '@shared/types';
import { KNOWN_AIRLINES, KNOWN_CITIES } from '@shared/data';
import { mergeSuggestions, saveStatusText } from '@shared/utils';
import styles from './App.module.css';

import { useFlightTracker } from './hooks';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);

  const {
    userName,
    userId,
    appUser,
    flights,
    airlines,
    originCities,
    destinationCities,
    loading,
    isCheckingToken,
    handleAddFlight,
    handleUpdateFlight,
    handleDuplicateFlight,
    handleDeleteFlight,
    handleJoinSession,
    handleLeaveGuestMode,
    saveStatus,
    retrySave,
  } = useFlightTracker();

  const isViewGuest = Boolean(appUser?.isGuest && appUser.permissions === 'view');
  const statusLabel = saveStatusText(saveStatus);
  const originSuggestions = useMemo(
    () => mergeSuggestions(originCities, KNOWN_CITIES),
    [originCities]
  );
  const destinationSuggestions = useMemo(
    () => mergeSuggestions(destinationCities, KNOWN_CITIES),
    [destinationCities]
  );
  const airlineSuggestions = useMemo(
    () => mergeSuggestions(airlines, KNOWN_AIRLINES),
    [airlines]
  );

  useEffect(() => {
    if (isViewGuest) {
      setActiveTab('history');
      setEditingFlight(null);
    }
  }, [isViewGuest]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleEditFlight = (flight: Flight) => {
    setEditingFlight(flight);
    setActiveTab('add');
  };

  const handleCancelEdit = () => {
    setEditingFlight(null);
    setActiveTab('history');
  };

  const handleFlightUpdated = (flight: Flight) => {
    handleUpdateFlight(flight);
  };

  const handleNavigateToHistory = () => {
    setEditingFlight(null);
    setActiveTab('history');
  };

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
      {appUser?.isGuest && (
        <GuestModeIndicator
          ownerName={appUser.ownerName || 'Владельца'}
          permissions={appUser.permissions}
          onLeave={handleLeaveGuestMode}
        />
      )}

      <h2 className={styles.title}>✈️ Flight Tracker</h2>
      <div className={styles.headerCopy}>
        <p className={styles.greeting}>
          Привет, <strong>{userName}</strong>!
        </p>
        {statusLabel && (
          <p
            className={[
              styles.saveStatus,
              saveStatus === 'error' ? styles.saveStatusError : '',
            ].filter(Boolean).join(' ')}
            role="status"
            aria-live="polite"
          >
            {statusLabel}
            {saveStatus === 'error' && (
              <button
                type="button"
                className={styles.saveStatusRetry}
                onClick={retrySave}
              >
                Повторить
              </button>
            )}
          </p>
        )}
      </div>

      {showShareModal && appUser && !appUser.isGuest && (
        <ShareFlightModal
          userId={appUser.userId}
          onClose={() => setShowShareModal(false)}
          onShareCreated={() => {}}
        />
      )}

      <div className={styles.tabs}>
        <button
          onClick={() => {
            if (!isViewGuest) setActiveTab('add');
          }}
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.active : ''}`}
          disabled={isViewGuest}
        >
          {isViewGuest
            ? '👁️ Добавить перелет'
            : editingFlight
              ? '✏️ Изменить перелет'
              : '➕ Добавить перелет'}
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
          key={editingFlight?.id ?? 'new'}
          flights={flights}
          airlines={airlineSuggestions}
          originCities={originSuggestions}
          destinationCities={destinationSuggestions}
          editingFlight={editingFlight}
          onAdd={handleAddFlight}
          onUpdate={handleFlightUpdated}
          onCancelEdit={handleCancelEdit}
          onNavigateToHistory={handleNavigateToHistory}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView
          flights={flights}
          onDelete={handleDeleteFlight}
          onEdit={handleEditFlight}
          onDuplicate={handleDuplicateFlight}
          onShare={() => setShowShareModal(true)}
          onJoin={handleJoinSession}
          userId={appUser?.userId || userId}
          isGuest={appUser?.isGuest || false}
          guestPermissions={appUser?.isGuest ? appUser.permissions : undefined}
        />
      )}

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
