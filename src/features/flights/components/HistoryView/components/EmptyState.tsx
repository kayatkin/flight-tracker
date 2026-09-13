import React from 'react';
import { Flight } from '@shared/types';
import { AccessManagement } from './AccessManagement';
import styles from '../HistoryView.module.css';

interface EmptyStateProps {
  isGuest: boolean;
  flights?: Flight[];
  userId?: string;
  onJoin?: (token: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  isGuest,
  flights = [],
  userId,
  onJoin
}) => {
  return (
    <div className={styles.container}>
      {!isGuest && userId && (
        <AccessManagement
          flights={flights}
          userId={userId}
          onJoin={onJoin}
          isEmptyState={true}
        />
      )}

      <div className={styles.emptyState}>
        <p>📭 Нет сохранённых билетов.</p>
        <p>Добавьте первый рейс во вкладке «➕ Добавить перелет»!</p>
      </div>
    </div>
  );
};