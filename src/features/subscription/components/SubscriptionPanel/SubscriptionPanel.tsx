import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanId } from '@shared/constants/subscription';
import styles from './SubscriptionPanel.module.css';

interface SubscriptionPanelProps {
  plan: PlanId;
  expiresAt: string | null;
  onUpgrade: () => void;
}

export const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({
  plan,
  expiresAt,
  onUpgrade,
}) => {
  const { t, i18n } = useTranslation();

  const expiryLabel =
    expiresAt &&
    new Date(expiresAt).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  return (
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.label}>{t('subscription.currentPlan')}</span>
        <span className={styles.value}>{plan === 'premium' ? t('plan.pro') : t('plan.free')}</span>
      </div>
      {plan === 'premium' && expiryLabel && (
        <div className={styles.row}>
          <span className={styles.label}>{t('subscription.expires')}</span>
          <span className={styles.value}>{expiryLabel}</span>
        </div>
      )}
      {plan === 'free' && (
        <button type="button" className={styles.upgradeBtn} onClick={onUpgrade}>
          {t('plan.upgradeCta')}
        </button>
      )}
    </div>
  );
};

export default SubscriptionPanel;
