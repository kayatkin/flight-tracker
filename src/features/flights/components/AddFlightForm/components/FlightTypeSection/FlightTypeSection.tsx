import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlightFormData } from '@shared/hooks';
import styles from './FlightTypeSection.module.css';

interface FlightTypeSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
}

const FlightTypeSection: React.FC<FlightTypeSectionProps> = ({ formData, updateFormData }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>✈️ {t('form.flightType.title')}</h4>
      <div className={styles.radioGroup}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="type"
            checked={formData.type === 'oneWay'}
            onChange={() => updateFormData({ type: 'oneWay' })}
            className={styles.radioInput}
            aria-label={t('form.flightType.oneWay')}
          />
          <span className={styles.radioText}>{t('form.flightType.oneWay')}</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="type"
            checked={formData.type === 'roundTrip'}
            onChange={() => updateFormData({ type: 'roundTrip' })}
            className={styles.radioInput}
            aria-label={t('form.flightType.roundTrip')}
          />
          <span className={styles.radioText}>{t('form.flightType.roundTrip')}</span>
        </label>
      </div>
    </div>
  );
};

export default FlightTypeSection;
