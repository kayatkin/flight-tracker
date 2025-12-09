// src/components/GuestModeIndicator.tsx
import React from 'react';
import styles from './GuestModeIndicator.module.css';

interface GuestModeIndicatorProps {
  ownerName: string;
  permissions: 'view' | 'edit';
  onLeave: () => void;
}

const GuestModeIndicator: React.FC<GuestModeIndicatorProps> = ({ 
  ownerName, 
  permissions, 
  onLeave 
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>👤</div>
        <div className={styles.info}>
          <div className={styles.mode}>Режим гостя</div>
          <div className={styles.details}>
            Вы просматриваете историю <strong>{ownerName}</strong>
          </div>
          <div className={styles.permissions}>
            Права: {permissions === 'view' ? '📖 Только просмотр' : '✏️ Просмотр и редактирование'}
          </div>
        </div>
        <button onClick={onLeave} className={styles.leaveButton}>
          Выйти
        </button>
      </div>
    </div>
  );
};

export default GuestModeIndicator;