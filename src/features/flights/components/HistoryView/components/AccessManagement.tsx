// src/features/flights/components/HistoryView/components/AccessManagement.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanId } from '@shared/constants/subscription';
import { Flight } from '@shared/types';
import { ShareFlightModal } from '@features/sharing';
import { SharedSessionsList } from '@features/sharing';
import { JoinSessionModal } from '@features/sharing';
import styles from '../HistoryView.module.css';
import { toast } from '@shared/ui/Toast';

interface AccessManagementProps {
  flights: Flight[];
  userId?: string;
  plan?: PlanId;
  onShare?: () => void;
  onJoin?: (token: string) => void;
  onUpgradeRequest?: () => void;
  isEmptyState: boolean;
}

export const AccessManagement: React.FC<AccessManagementProps> = ({
  flights,
  userId,
  plan = 'free',
  onShare,
  onJoin,
  onUpgradeRequest,
  isEmptyState,
}) => {
  const { t } = useTranslation();
  const [accessExpanded, setAccessExpanded] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);
  const [showSessionsModal, setShowSessionsModal] = useState<boolean>(false);

  const handleJoin = (token: string) => {
    if (onJoin) {
      onJoin(token);
    }
  };

  const handleShareCreated = (token: string) => {
    console.log('Share created with token:', token);
    // Можно добавить логику, например показать уведомление
  };

  return (
    <>
      <div className={styles.accessManagementContainer}>
        {/* Заголовок аккордеона */}
        <div 
          className={`${styles.accessHeader} ${accessExpanded ? styles.accessHeaderExpanded : ''}`}
          onClick={() => setAccessExpanded(!accessExpanded)}
        >
          <div className={styles.accessHeaderContent}>
            <span className={styles.accessIcon}>🔐</span>
            <span className={styles.accessTitle}>
              {isEmptyState ? t('access.titleEmpty') : t('access.title')}
            </span>
            <span className={styles.accessArrow}>{accessExpanded ? '▼' : '▶'}</span>
          </div>
          {!accessExpanded && (
            <div className={styles.accessHint}>
              {isEmptyState ? t('access.subtitleEmpty') : t('access.subtitle')}
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
                    toast(t('access.shareNeedFlight'), 'warning');
                  }
                }}
                className={styles.shareButton}
                title={flights.length === 0 ? t('access.shareTitleEmpty') : t('access.shareTitle')}
                disabled={flights.length === 0 || !userId}
              >
                📤 {flights.length === 0 ? t('access.shareEmpty') : t('access.share')}
              </button>
              
              {/* Кнопка Присоединиться */}
              <button
                onClick={() => setShowJoinModal(true)}
                className={styles.joinHistoryButton}
                title={t('access.joinTitle')}
              >
                🔗 {t('access.join')}
              </button>
              
              {/* Кнопка Приглашения */}
              {userId && (
                <button
                  onClick={() => {
                    if (flights.length > 0) {
                      setShowSessionsModal(true);
                    } else {
                      toast(t('access.invitesNeedFlight'), 'warning');
                    }
                  }}
                  className={styles.sessionsListButton}
                  title={flights.length === 0 ? t('access.invitesTitleEmpty') : t('access.invitesTitle')}
                  disabled={flights.length === 0}
                >
                  📋 {t('access.invites')}
                </button>
              )}
            </div>
            
            {/* Информационное сообщение если нет перелетов */}
            {flights.length === 0 && (
              <div className={styles.noFlightsMessage}>
                <p>📝 <strong>{t('access.howToTitle')}</strong></p>
                <ol className={styles.noFlightsList}>
                  <li>{t('access.howTo1')}</li>
                  <li>{t('access.howTo2')}</li>
                  <li>{t('access.howTo3')}</li>
                </ol>
              </div>
            )}
            
            {/* Подсказка внизу аккордеона */}
            <div className={styles.accessFooter}>
              <span className={styles.accessFooterHint}>
                {flights.length === 0 ? t('access.footerEmpty') : t('access.footer')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно "Поделиться" */}
      {showShareModal && userId && (
        <ShareFlightModal
          userId={userId}
          plan={plan}
          onClose={() => setShowShareModal(false)}
          onShareCreated={handleShareCreated}
          onUpgradeRequest={onUpgradeRequest}
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
          onSessionDeactivated={() => {
            console.log('Приглашение отозвано');
            // Можно добавить обновление данных
          }}
        />
      )}
    </>
  );
};