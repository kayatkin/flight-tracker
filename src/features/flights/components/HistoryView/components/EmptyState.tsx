import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanId } from '@shared/constants/subscription';
import { Flight } from '@shared/types';
import { AccessManagement } from './AccessManagement';
import styles from '../HistoryView.module.css';

interface EmptyStateProps {
  isGuest: boolean;
  guestPermissions: 'view' | 'edit';
  flights?: Flight[];
  userId?: string;
  plan?: PlanId;
  onShare?: () => void;
  onJoin?: (token: string) => void;
  onUpgradeRequest?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  isGuest,
  guestPermissions,
  flights = [],
  userId,
  plan = 'free',
  onShare,
  onJoin,
  onUpgradeRequest,
}) => {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      {/* Аккордеон управления доступом для владельцев */}
      {!isGuest && userId && (
        <AccessManagement
          flights={flights}
          userId={userId}
          plan={plan}
          onShare={onShare}
          onJoin={onJoin}
          onUpgradeRequest={onUpgradeRequest}
          isEmptyState={true}
        />
      )}

      {/* Основной контент пустого состояния */}
      <div className={styles.emptyState}>
        <p>📭 {t('history.emptyTitle')}</p>
        <p>{t('history.emptyHint')}</p>
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