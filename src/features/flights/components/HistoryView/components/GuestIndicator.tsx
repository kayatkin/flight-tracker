import React from 'react';
import styles from '../HistoryView.module.css';

interface GuestIndicatorProps {
  guestPermissions: 'view' | 'edit';
}

export const GuestIndicator: React.FC<GuestIndicatorProps> = ({ 
  guestPermissions 
}) => {
  return (
    <div className={styles.guestIndicator}>
      <div className={styles.guestIcon}>👤</div>
      <div className={styles.guestInfo}>
        <div className={styles.guestTitle}>Режим гостя</div>
        <div className={styles.guestPermissions}>
          Права доступа: <strong>{guestPermissions === 'edit' ? '✏️ Просмотр и редактирование' : '👁️ Только просмотр'}</strong>
        </div>
      </div>
    </div>
  );
};
