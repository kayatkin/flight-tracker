import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PriceAnalysis.module.css';

export interface PriceAnalysisProps {
  type: 'good' | 'neutral' | 'bad';
  message: string;
  diff?: number;
}

const PriceAnalysis: React.FC<PriceAnalysisProps> = ({ type, message, diff }) => {
  const { t } = useTranslation();

  const getIcon = () => {
    switch (type) {
      case 'good':
        return '✅';
      case 'neutral':
        return '⚖️';
      case 'bad':
        return '⚠️';
      default:
        return '';
    }
  };

  return (
    <div
      className={`${styles.analysis} ${styles[`analysis${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.message}>
        <span className={styles.icon}>{getIcon()}</span>
        {message}
      </div>
      {diff !== undefined && (
        <div className={styles.diff}>
          {t('priceAnalysis.diff', {
            sign: diff > 0 ? '+' : '',
            amount: diff,
          })}
        </div>
      )}
    </div>
  );
};

export default PriceAnalysis;
