import React from 'react';
import { t } from '@shared/i18n';
import { FlightFormData } from '@shared/hooks';
import styles from './LayoverSection.module.css';

interface LayoverSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
}

const LayoverSection: React.FC<LayoverSectionProps> = ({
  formData,
  updateFormData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      updateFormData({ [name]: checked });
    } else if (type === 'number') {
      updateFormData({ [name]: Number(value) || 60 });
    } else {
      updateFormData({ [name]: value });
    }
  };

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>{t('form.layover')}</h4>
      
      {/* Пересадка туда */}
      <div className={styles.layoverGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="isDirectThere"
            checked={formData.isDirectThere}
            onChange={handleChange}
            aria-label={t('form.directThere')}
          />
          {t('form.directThere')}
        </label>
        
        {!formData.isDirectThere && (
          <div className={styles.layoverFields}>
            <div className={styles.layoverField}>
              <label className={styles.label}>
                {t('form.layoverCityThere')}
                <input
                  type="text"
                  name="layoverCityThere"
                  value={formData.layoverCityThere || ''}
                  onChange={handleChange}
                  placeholder={t('form.layoverCityTherePlaceholder')}
                  className={styles.layoverInput}
                  aria-label={t('form.layoverCityThereAria')}
                />
              </label>
            </div>
            
            <div className={styles.layoverField}>
              <label className={styles.label}>
                {t('form.layoverMinutes')}
                <input
                  type="number"
                  name="layoverDurationThere"
                  value={formData.layoverDurationThere || 60}
                  onChange={handleChange}
                  min="30"
                  max="1440"
                  className={styles.layoverInput}
                  aria-label={t('form.layoverMinutesThereAria')}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Пересадка обратно (только для туда-обратно) */}
      {formData.type === 'roundTrip' && (
        <div className={styles.layoverGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="isDirectBack"
              checked={formData.isDirectBack}
              onChange={handleChange}
              aria-label={t('form.directBack')}
            />
            {t('form.directBack')}
          </label>
          
          {!formData.isDirectBack && (
            <div className={styles.layoverFields}>
              <div className={styles.layoverField}>
                <label className={styles.label}>
                  {t('form.layoverCityBack')}
                  <input
                    type="text"
                    name="layoverCityBack"
                    value={formData.layoverCityBack || ''}
                    onChange={handleChange}
                    placeholder={t('form.layoverCityBackPlaceholder')}
                    className={styles.layoverInput}
                    aria-label={t('form.layoverCityBackAria')}
                  />
                </label>
              </div>
              
              <div className={styles.layoverField}>
                <label className={styles.label}>
                  {t('form.layoverMinutes')}
                  <input
                    type="number"
                    name="layoverDurationBack"
                    value={formData.layoverDurationBack || 60}
                    onChange={handleChange}
                    min="30"
                    max="1440"
                    className={styles.layoverInput}
                    aria-label={t('form.layoverMinutesBackAria')}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LayoverSection;