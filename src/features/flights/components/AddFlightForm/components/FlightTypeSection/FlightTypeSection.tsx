import React from 'react';
import { t } from '@shared/i18n';
import { FlightFormData } from '@shared/hooks';
import styles from './FlightTypeSection.module.css';

interface FlightTypeSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
}

const FlightTypeSection: React.FC<FlightTypeSectionProps> = ({
  formData,
  updateFormData
}) => {
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>{t('form.type')}</h4>
      <div className={styles.radioGroup}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="type"
            checked={formData.type === 'oneWay'}
            onChange={() => updateFormData({ type: 'oneWay' })}
            className={styles.radioInput}
            aria-label={t('form.oneWay')}
          />
          <span className={styles.radioText}>{t('form.oneWay')}</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="type"
            checked={formData.type === 'roundTrip'}
            onChange={() => updateFormData({ type: 'roundTrip' })}
            className={styles.radioInput}
            aria-label={t('form.roundTrip')}
          />
          <span className={styles.radioText}>{t('form.roundTrip')}</span>
        </label>
      </div>
    </div>
  );
};

export default FlightTypeSection;