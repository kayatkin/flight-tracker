import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlightFormData } from '@shared/hooks';
import styles from './PassengersSection.module.css';

interface PassengersSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
}

const PassengersSection: React.FC<PassengersSectionProps> = ({
  formData,
  updateFormData
}) => {
  const { t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value) as 1 | 2 | 3 | 4;
    updateFormData({ passengers: value });
  };

  const passengersOptions: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>👥 {t('form.passengers.title')}</h4>
      
      <div className={styles.selectContainer}>
        <label className={styles.label}>
          <select
            name="passengers"
            value={formData.passengers}
            onChange={handleChange}
            className={styles.select}
            aria-label={t('form.passengers.label')}
          >
            {passengersOptions.map(num => (
              <option key={num} value={num}>
                {t('form.passengers.count', { count: num })}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};

export default PassengersSection;
