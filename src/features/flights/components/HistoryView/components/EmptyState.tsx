import React from 'react';
import { Flight } from '@shared/types';
import { AccessManagement } from './AccessManagement';
import styles from '../HistoryView.module.css';

interface EmptyStateProps {
  isGuest: boolean;
  guestPermissions: 'view' | 'edit';
  flights?: Flight[];
  userId?: string;
  onShare?: () => void;
  onJoin?: (token: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  isGuest,
  guestPermissions: _guestPermissions,
  flights = [],
  userId,
  onShare,
  onJoin
}) => {
  return (
    <div className={styles.container}>
      {/* Аккордеон управления доступом для владельцев */}
      {!isGuest && userId && (
        <AccessManagement
          flights={flights}
          userId={userId}
          onShare={onShare}
          onJoin={onJoin}
          isEmptyState={true}
        />
      )}

      {/* Основной контент пустого состояния */}
      <div className={styles.emptyState}>
        <p>📭 Нет сохранённых билетов.</p>
        <p>Добавьте первый рейс во вкладке «➕ Добавить перелет»!</p>
        {/*
        {isGuest && (
          <div className={styles.guestHint}>
            <p>Вы находитесь в режиме гостя с правами{' '}
              <strong>
                {guestPermissions === 'edit' ? 'редактирования' : 'просмотра'}
              </strong>.
            </p>
            <p>Чтобы создать свою историю, перейдите по основной ссылке приложения.</p>
          </div>
        )}
        */}
      </div>
    </div>
  );
};