import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanId } from '@shared/constants/subscription';
import { PLAN_LIMITS } from '@shared/constants/subscription';
import { countUniqueRoutes } from '@shared/utils/subscriptionLimits';
import type { Flight } from '@shared/types';
import styles from './PlanBadge.module.css';

interface PlanBadgeProps {
  plan: PlanId;
  flights: Flight[];
  onUpgradeClick?: () => void;
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, flights, onUpgradeClick }) => {
  const { t } = useTranslation();
  const used = countUniqueRoutes(flights);
  const max = PLAN_LIMITS[plan].maxDestinations;
  const maxLabel = Number.isFinite(max) ? String(max) : '∞';

  const content = (
    <>
      <span className={styles.planName}>{plan === 'premium' ? t('plan.pro') : t('plan.free')}</span>
      <span className={styles.usage}>{t('plan.destinationsUsed', { used, max: maxLabel })}</span>
      {plan === 'free' && onUpgradeClick && (
        <span className={styles.upgradeLink}>{t('plan.upgradeCta')}</span>
      )}
    </>
  );

  if (plan === 'free' && onUpgradeClick) {
    return (
      <button
        type="button"
        className={`${styles.badge} ${styles.badgeButton}`}
        onClick={onUpgradeClick}
        title={t('plan.upgradeCta')}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={styles.badge}
      title={t('plan.destinationsUsed', { used, max: maxLabel })}
      aria-label={t('plan.destinationsUsed', { used, max: maxLabel })}
    >
      {content}
    </div>
  );
};

export default PlanBadge;
