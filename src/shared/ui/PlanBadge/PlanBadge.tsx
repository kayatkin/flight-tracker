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
}

export const PlanBadge: React.FC<PlanBadgeProps> = ({ plan, flights }) => {
  const { t } = useTranslation();
  const used = countUniqueRoutes(flights);
  const max = PLAN_LIMITS[plan].maxDestinations;
  const maxLabel = Number.isFinite(max) ? String(max) : '∞';

  return (
    <div
      className={styles.badge}
      title={t('plan.destinationsUsed', { used, max: maxLabel })}
      aria-label={t('plan.destinationsUsed', { used, max: maxLabel })}
    >
      <span className={styles.planName}>{plan === 'premium' ? t('plan.pro') : t('plan.free')}</span>
      <span className={styles.usage}>
        {t('plan.destinationsUsed', { used, max: maxLabel })}
      </span>
    </div>
  );
};

export default PlanBadge;
