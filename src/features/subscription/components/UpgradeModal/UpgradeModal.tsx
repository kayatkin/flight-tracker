import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { BillingPeriod, PlanId } from '@shared/constants/subscription';
import { PRO_PRICING } from '@shared/constants/subscription';
import {
  createProInvoice,
  getTelegramInitData,
  isTelegramMiniApp,
  openStarsInvoice,
} from '@services/paymentService';
import { toast } from '@shared/ui/Toast';
import styles from './UpgradeModal.module.css';

interface UpgradeModalProps {
  plan: PlanId;
  onClose: () => void;
  onActivated: () => void;
}

const PERIODS: BillingPeriod[] = ['monthly', 'annual'];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ plan, onClose, onActivated }) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<BillingPeriod>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = useCallback(async () => {
    setError('');

    if (plan === 'premium') {
      toast(t('upgrade.alreadyPro'), 'info');
      onClose();
      return;
    }

    if (!isTelegramMiniApp()) {
      setError(t('upgrade.telegramOnly'));
      return;
    }

    const initData = getTelegramInitData();
    if (!initData) {
      setError(t('upgrade.telegramOnly'));
      return;
    }

    setLoading(true);
    try {
      const { invoiceUrl } = await createProInvoice(initData, period);
      const status = await openStarsInvoice(invoiceUrl);

      if (status === 'paid') {
        toast(t('upgrade.success'), 'success');
        onActivated();
        onClose();
        return;
      }

      if (status === 'cancelled') {
        toast(t('upgrade.cancelled'), 'info');
        return;
      }

      toast(t('upgrade.failed'), 'warning');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('upgrade.failed');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [plan, period, t, onActivated, onClose]);

  if (plan === 'premium') {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{t('upgrade.title')}</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('upgrade.close')}>
            ×
          </button>
        </div>

        <p className={styles.subtitle}>{t('upgrade.subtitle')}</p>

        <ul className={styles.features}>
          <li>✈️ {t('upgrade.featureRoutes')}</li>
          <li>📊 {t('upgrade.featureCharts')}</li>
          <li>🔗 {t('upgrade.featureShare')}</li>
        </ul>

        <div className={styles.plans}>
          {PERIODS.map((p) => {
            const pricing = PRO_PRICING[p];
            const selected = period === p;
            return (
              <button
                key={p}
                type="button"
                className={`${styles.planCard} ${selected ? styles.planCardSelected : ''}`}
                onClick={() => setPeriod(p)}
              >
                <span className={styles.planTitle}>{t(pricing.labelKey)}</span>
                <span className={styles.planPrice}>{t('upgrade.starsPrice', { stars: pricing.stars })}</span>
                {p === 'annual' && <span className={styles.planSave}>{t('upgrade.annualSave')}</span>}
              </button>
            );
          })}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="button"
          className={styles.primaryBtn}
          disabled={loading}
          onClick={() => void handlePurchase()}
        >
          {loading ? t('upgrade.processing') : t('upgrade.cta')}
        </button>

        <p className={styles.hint}>{t('upgrade.starsHint')}</p>
      </div>
    </div>
  );
};

export default UpgradeModal;
