// src/features/flights/components/HistoryView/components/AccessManagement.tsx
import React, { useState } from 'react';
import { Flight } from '@shared/types';
import { ShareFlightModal } from '@features/sharing';
import { SharedSessionsList } from '@features/sharing';
import { JoinSessionModal } from '@features/sharing';
import type { JoinSessionHandler } from '@features/sharing';
import { t } from '@shared/i18n';
import { toast } from '@shared/ui/Toast';
import styles from '../HistoryView.module.css';

interface AccessManagementProps {
  flights: Flight[];
  userId?: string;
  onJoin?: JoinSessionHandler;
  isEmptyState: boolean;
}

export const AccessManagement: React.FC<AccessManagementProps> = ({
  flights,
  userId,
  onJoin,
  isEmptyState,
}) => {
  const [accessExpanded, setAccessExpanded] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [showSessionsModal, setShowSessionsModal] = useState<boolean>(false);

  const handleJoin: JoinSessionHandler = async (token) => {
    if (!onJoin) return false;
    return onJoin(token);
  };

  const handleShareCreated = () => {
    // Список сессий сам обновится при следующем открытии
  };

  return (
    <>
      <div className={styles.accessManagementContainer}>
        {/* Заголовок аккордеона */}
        <div
          className={`${styles.accessHeader} ${accessExpanded ? styles.accessHeaderExpanded : ''}`}
          onClick={() => setAccessExpanded(!accessExpanded)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setAccessExpanded((open) => !open);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={accessExpanded}
          aria-label={isEmptyState
            ? t('access.ariaEmpty')
            : t('access.ariaFilled')}
        >
          <div className={styles.accessHeaderContent}>
            <span className={styles.accessIcon}>🔐</span>
            <span className={styles.accessTitle}>
              {isEmptyState
                ? t('access.titleEmpty')
                : t('access.titleFilled')}
            </span>
            <span className={styles.accessArrow}>{accessExpanded ? '▼' : '▶'}</span>
          </div>
          {!accessExpanded && (
            <div className={styles.accessHint}>
              {isEmptyState
                ? t('access.hintEmpty')
                : t('access.hintFilled')}
            </div>
          )}
        </div>
        
        {/* Содержимое аккордеона */}
        {accessExpanded && (
          <div className={styles.accessContent}>
            <div className={styles.accessButtonsGroup}>
              {/* Кнопка Поделиться */}
              <button
                onClick={() => {
                  if (flights.length > 0 && userId) {
                    setShowShareModal(true);
                  } else {
                    toast(t('access.needFlightShare'), 'warning');
                  }
                }}
                className={styles.shareButton}
                title={flights.length === 0 ? t('access.addFirstTitle') : t('access.shareTitle')}
                disabled={flights.length === 0 || !userId}
              >
                📤 {flights.length === 0 ? t('access.addFirst') : t('access.share')}
              </button>
              
              {/* Кнопка Присоединиться */}
              <button
                onClick={() => setShowJoinModal(true)}
                className={styles.joinHistoryButton}
                title={t('access.joinTitle')}
              >
                {t('access.join')}
              </button>
              
              {/* Кнопка Приглашения */}
              {userId && (
                <button
                  onClick={() => {
                    if (flights.length > 0) {
                      setShowSessionsModal(true);
                    } else {
                      toast(t('access.needFlight'), 'warning');
                    }
                  }}
                  className={styles.sessionsListButton}
                  title={flights.length === 0 ? t('access.addFirstTitle') : t('access.invitesTitle')}
                  disabled={flights.length === 0}
                >
                  {t('access.invites')}
                </button>
              )}
            </div>
            
            {/* Информационное сообщение если нет перелетов */}
            {flights.length === 0 && (
              <div className={styles.noFlightsMessage}>
                <p>📝 <strong>{t('access.createTitle')}</strong></p>
                <ol className={styles.noFlightsList}>
                  <li>{t('access.createStep1')}</li>
                  <li>{t('access.createStep2')}</li>
                  <li>{t('access.createStep3')}</li>
                </ol>
              </div>
            )}
            
            {/* Подсказка внизу аккордеона */}
            <div className={styles.accessFooter}>
              <span className={styles.accessFooterHint}>
                {flights.length === 0
                  ? t('access.footerEmpty')
                  : t('access.footerFilled')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно "Поделиться" */}
      {showShareModal && userId && (
        <ShareFlightModal
          userId={userId}
          onClose={() => setShowShareModal(false)}
          onShareCreated={handleShareCreated}
        />
      )}

      {/* Модальное окно "Присоединиться" */}
      {showJoinModal && (
        <JoinSessionModal
          onJoin={handleJoin}
          onClose={() => setShowJoinModal(false)}
        />
      )}

      {/* Модальное окно "Приглашения" */}
      {showSessionsModal && userId && (
        <SharedSessionsList
          userId={userId}
          onClose={() => setShowSessionsModal(false)}
          onSessionDeactivated={() => undefined}
        />
      )}
    </>
  );
};