import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
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
  const { t } = useTranslation();
  const permsLabel = permissions === 'view' ? t('common.permissionsViewLabel') : t('common.permissionsEditLabel');
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>👤</div>
        <div className={styles.info}>
          <div className={styles.mode}>{t('guest.mode')}</div>
          <div className={styles.details}>
            <Trans i18nKey="guest.viewing" values={{ name: ownerName }} components={{ strong: <strong /> }} />
          </div>
          <div className={styles.permissions}>
            {t('guest.permissions', { perms: permsLabel })}
          </div>
        </div>
        <button onClick={onLeave} className={styles.leaveButton}>
          {t('guest.exit')}
        </button>
      </div>
    </div>
  );
};

export default GuestModeIndicator;
