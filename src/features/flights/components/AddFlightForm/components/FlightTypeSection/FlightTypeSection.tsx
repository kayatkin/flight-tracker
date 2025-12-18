import React from 'react';
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
      <h4 className={styles.sectionTitle}>✈️ Тип рейса</h4>
      <div className={styles.radioGroup}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="type"
            checked={formData.type === 'oneWay'}
            onChange={() => updateFormData({ type: 'oneWay' })}
            className={styles.radioInput}
            aria-label="Только туда"
          />
          <span className={styles.radioText}>Только туда</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            name="type"
            checked={formData.type === 'roundTrip'}
            onChange={() => updateFormData({ type: 'roundTrip' })}
            className={styles.radioInput}
            aria-label="Туда и обратно"
          />
          <span className={styles.radioText}>Туда и обратно</span>
        </label>
      </div>
    </div>
  );
};

export default FlightTypeSection;