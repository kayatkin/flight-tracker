import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { AddFlightForm } from '@features/flights';
import { HistoryView } from '@features/flights';
import { GuestModeIndicator } from '@features/guest-mode';
import { ShareFlightModal } from '@features/sharing';
import { LanguageSwitcher } from '@shared/ui/LanguageSwitcher';
import { PlanBadge } from '@shared/ui/PlanBadge';
import { UpgradeModal, SubscriptionPanel } from '@features/subscription';
import { useFlightTracker } from './hooks';
import styles from './App.module.css';

const App: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

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
    handleDeleteFlight,
    handleJoinSession,
    handleLeaveGuestMode,
    plan,
    chartsEnabled,
    refreshPlan,
    planExpiresAt,
  } = useFlightTracker({ onLimitReached: () => setShowUpgradeModal(true) });

  if (loading || isCheckingToken) {
    return (
      <div className={styles.app} style={{ textAlign: 'center', padding: '40px' }}>
        <div className={styles.loadingText}>{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        {!appUser?.isGuest && (
          <PlanBadge
            plan={plan}
            flights={flights}
            onUpgradeClick={plan === 'free' ? () => setShowUpgradeModal(true) : undefined}
          />
        )}
        <div className={styles.headerActions}>
          <LanguageSwitcher />
        </div>
      </header>

      {appUser?.isGuest && (
        <GuestModeIndicator
          ownerName={appUser.ownerName || 'Owner'}
          permissions={appUser.permissions}
          onLeave={handleLeaveGuestMode}
        />
      )}

      {!appUser?.isGuest && (
        <SubscriptionPanel
          plan={plan}
          expiresAt={planExpiresAt}
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      )}

      <h2 className={styles.title}>✈️ {t('app.title')}</h2>
      <p className={styles.greeting}>
        <Trans i18nKey="app.greeting" values={{ name: userName }} components={{ strong: <strong /> }} />
      </p>

      {showUpgradeModal && !appUser?.isGuest && (
        <UpgradeModal
          plan={plan}
          onClose={() => setShowUpgradeModal(false)}
          onActivated={() => void refreshPlan()}
        />
      )}

      {showShareModal && appUser && !appUser.isGuest && (
        <ShareFlightModal
          userId={appUser.userId}
          plan={plan}
          onClose={() => setShowShareModal(false)}
          onShareCreated={() => {}}
          onUpgradeRequest={() => {
            setShowShareModal(false);
            setShowUpgradeModal(true);
          }}
        />
      )}

      <div className={styles.tabs}>
        <button
          type="button"
          onClick={() => setActiveTab('add')}
          className={`${styles.tabButton} ${activeTab === 'add' ? styles.active : ''}`}
          disabled={appUser?.isGuest && appUser.permissions === 'view'}
        >
          {appUser?.isGuest && appUser.permissions === 'view'
            ? `👁️ ${t('tabs.addViewOnly')}`
            : `➕ ${t('tabs.add')}`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`${styles.tabButton} ${activeTab === 'history' ? styles.active : ''}`}
        >
          📚 {t('tabs.history')}
        </button>
      </div>

      {activeTab === 'add' && (
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
          userId={appUser?.userId || userId}
          isGuest={appUser?.isGuest || false}
          guestPermissions={appUser?.isGuest ? appUser.permissions : undefined}
          chartsEnabled={chartsEnabled}
          plan={plan}
          onUpgradeRequest={() => setShowUpgradeModal(true)}
        />
      )}

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          .${styles.loadingText} {
            animation: pulse 1.5s infinite;
          }
        `}
      </style>
    </div>
  );
};

export default App;

