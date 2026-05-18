// src/features/flights/components/HistoryView/components/AccessManagement.tsx
import React, { useState } from 'react';
import { Flight } from '@shared/types';
import { ShareFlightModal } from '@features/sharing';
import { SharedSessionsList } from '@features/sharing';
import { JoinSessionModal } from '@features/sharing';
import styles from '../HistoryView.module.css';
import { toast } from '@shared/ui/Toast';

interface AccessManagementProps {
  flights: Flight[];
  userId?: string;
  onShare?: () => void;
  onJoin?: (token: string) => void;
  isEmptyState: boolean;
}

export const AccessManagement: React.FC<AccessManagementProps> = ({
  flights,
  userId,
  onShare,
  onJoin,
  isEmptyState,
}) => {
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
              {isEmptyState 
                ? 'Начните отслеживать перелеты и делитесь историей' 
                : 'Управляйте доступом к вашей истории перелетов'
              }
            </span>
            <span className={styles.accessArrow}>{accessExpanded ? '▼' : '▶'}</span>
          </div>
          {!accessExpanded && (
            <div className={styles.accessHint}>
              {isEmptyState 
                ? 'Создайте первую запись или присоединитесь к истории друга' 
                : 'Нажмите чтобы развернуть'
              }
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
                    toast('Сначала добавьте хотя бы один перелёт, чтобы поделиться историей', 'warning');
                  }
                }}
                className={styles.shareButton}
                title={flights.length === 0 ? "Сначала добавьте перелет" : "Поделиться историей перелетов"}
                disabled={flights.length === 0 || !userId}
              >
                📤 {flights.length === 0 ? 'Добавьте перелет' : 'Поделиться'}
              </button>
              
              {/* Кнопка Присоединиться */}
              <button
                onClick={() => setShowJoinModal(true)}
                className={styles.joinHistoryButton}
                title="Присоединиться к истории друга"
              >
                🔗 Присоединиться
              </button>
              
              {/* Кнопка Приглашения */}
              {userId && (
                <button
                  onClick={() => {
                    if (flights.length > 0) {
                      setShowSessionsModal(true);
                    } else {
                      toast('Сначала добавьте хотя бы один перелёт', 'warning');
                    }
                  }}
                  className={styles.sessionsListButton}
                  title={flights.length === 0 ? "Сначала добавьте перелет" : "Показать выданные приглашения"}
                  disabled={flights.length === 0}
                >
                  📋 Приглашения
                </button>
              )}
            </div>
            
            {/* Информационное сообщение если нет перелетов */}
            {flights.length === 0 && (
              <div className={styles.noFlightsMessage}>
                <p>📝 <strong>Создайте свою историю перелетов:</strong></p>
                <ol className={styles.noFlightsList}>
                  <li>Добавьте первый перелет во вкладке «➕ Добавить»</li>
                  <li>Затем сможете поделиться историей с другими</li>
                  <li>Или присоединитесь к истории друга прямо сейчас!</li>
                </ol>
              </div>
            )}
            
            {/* Подсказка внизу аккордеона */}
            <div className={styles.accessFooter}>
              <span className={styles.accessFooterHint}>
                {flights.length === 0 
                  ? '💡 Начните с добавления первого перелета или присоединитесь к истории друга'
                  : '💡 Создавайте приглашения, присоединяйтесь к другим и управляйте доступом'
                }
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
          onSessionDeactivated={() => {
            console.log('Приглашение отозвано');
            // Можно добавить обновление данных
          }}
        />
      )}
    </>
  );
};