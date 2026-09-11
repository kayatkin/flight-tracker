import React, { useState, useEffect, useMemo } from 'react';
import { AddFlightForm } from '@features/flights';
import { HistoryView } from '@features/flights';
import { GuestModeIndicator } from '@features/guest-mode';
import { Flight } from '@shared/types';
import { KNOWN_AIRLINES, KNOWN_CITIES } from '@shared/data';
import {
  mergeSuggestions,
  saveStatusText,
  confirmDiscardUnsaved,
  clearFormDraft,
  clearEditFormDraft,
} from '@shared/utils';
import { useFlightTracker } from '@shared/hooks';
import styles from './App.module.css';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [formDirty, setFormDirty] = useState(false);

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
    handleRestoreFlight,
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

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!formDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [formDirty]);

  const clearDrafts = () => {
    if (typeof sessionStorage === 'undefined') return;
    clearFormDraft(sessionStorage);
    clearEditFormDraft(sessionStorage);
  };

  const handleEditFlight = (flight: Flight) => {
    setEditingFlight(flight);
    setActiveTab('add');
  };

  const handleCancelEdit = () => {
    if (typeof sessionStorage !== 'undefined') {
      clearEditFormDraft(sessionStorage);
    }
    setFormDirty(false);
    setEditingFlight(null);
    setActiveTab('history');
  };

  const handleFlightUpdated = (flight: Flight) => {
    handleUpdateFlight(flight);
  };

  const handleNavigateToHistory = () => {
    clearDrafts();
    setFormDirty(false);
    setEditingFlight(null);
    setActiveTab('history');
  };

  const leaveAddTab = (next: () => void) => {
    if (formDirty && !confirmDiscardUnsaved()) return;
    if (formDirty) clearDrafts();
    setFormDirty(false);
    setEditingFlight(null);
    next();
  };

  if (loading || isCheckingToken) {
    return (
      <div className={`${styles.app} ${styles.loadingScreen}`}>
        <div className={styles.loadingLabel}>
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
          onClick={() => {
            if (activeTab === 'history') return;
            leaveAddTab(() => setActiveTab('history'));
          }}
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
          onDirtyChange={setFormDirty}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView
          flights={flights}
          onDelete={handleDeleteFlight}
          onRestore={handleRestoreFlight}
          onEdit={handleEditFlight}
          onDuplicate={handleDuplicateFlight}
          onJoin={handleJoinSession}
          userId={appUser?.userId || userId}
          isGuest={appUser?.isGuest || false}
          guestPermissions={appUser?.isGuest ? appUser.permissions : undefined}
        />
      )}
    </div>
  );
};

export default App;
