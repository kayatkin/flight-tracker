import React from 'react';
import { t } from '@shared/i18n';
import styles from './GuestModeIndicator.module.css';

interface GuestModeIndicatorProps {
  ownerName: string;
  permissions: 'view' | 'edit';
  onLeave: () => void;
}

const GuestModeIndicator: React.FC<GuestModeIndicatorProps> = ({
  ownerName,
  permissions,
  onLeave,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>👤</div>
        <div className={styles.info}>
          <div className={styles.mode}>{t('guest.mode')}</div>
          <div className={styles.details}>
            {t('guest.viewing')} <strong>{ownerName}</strong>
          </div>
          <div className={styles.permissions}>
            {t('guest.rights')} {permissions === 'view' ? t('guest.viewOnly') : t('guest.viewEdit')}
          </div>
        </div>
        <button onClick={onLeave} className={styles.leaveButton}>
          {t('guest.leave')}
        </button>
      </div>
    </div>
  );
};

export default GuestModeIndicator;
