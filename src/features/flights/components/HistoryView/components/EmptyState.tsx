import React from 'react';
import { t } from '@shared/i18n';
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
        <p>{t('history.empty')}</p>
        <p>{t('history.emptyHint')}</p>
      </div>
    </div>
  );
};