import React from 'react';
import { t, passengerWord } from '@shared/i18n';
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
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(e.target.value) as 1 | 2 | 3 | 4;
    updateFormData({ passengers: value });
  };

  const passengersOptions: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>{t('form.passengers')}</h4>
      
      <div className={styles.selectContainer}>
        <label className={styles.label}>
          <select
            name="passengers"
            value={formData.passengers}
            onChange={handleChange}
            className={styles.select}
            aria-label={t('form.passengersAria')}
          >
            {passengersOptions.map(num => (
              <option key={num} value={num}>
                {num} {passengerWord(num)}
              </option>
            ))}
          </select>
        </label>
        
        {/* УБРАТЬ ЭТОТ БЛОК */}
        {/* 
        <div className={styles.passengerIcons}>
          {Array.from({ length: formData.passengers }).map((_, index) => (
            <span key={index} className={styles.passengerIcon}>👤</span>
          ))}
        </div>
        */}
      </div>
    </div>
  );
};

export default PassengersSection;