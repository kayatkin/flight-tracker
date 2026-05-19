import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

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
      <h4 className={styles.sectionTitle}>🔄 {t('form.layover.title')}</h4>
      
      <div className={styles.layoverGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="isDirectThere"
            checked={formData.isDirectThere}
            onChange={handleChange}
            aria-label={t('form.layover.directThere')}
          />
          {t('form.layover.directThere')}
        </label>
        
        {!formData.isDirectThere && (
          <div className={styles.layoverFields}>
            <div className={styles.layoverField}>
              <label className={styles.label}>
                {t('form.layover.cityThere')}
                <input
                  type="text"
                  name="layoverCityThere"
                  value={formData.layoverCityThere || ''}
                  onChange={handleChange}
                  placeholder={t('form.layover.cityTherePlaceholder')}
                  className={styles.layoverInput}
                  aria-label={t('form.layover.cityThere')}
                />
              </label>
            </div>
            
            <div className={styles.layoverField}>
              <label className={styles.label}>
                {t('form.layover.duration')}
                <input
                  type="number"
                  name="layoverDurationThere"
                  value={formData.layoverDurationThere || 60}
                  onChange={handleChange}
                  min="30"
                  max="1440"
                  className={styles.layoverInput}
                  aria-label={t('form.layover.duration')}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {formData.type === 'roundTrip' && (
        <div className={styles.layoverGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="isDirectBack"
              checked={formData.isDirectBack}
              onChange={handleChange}
              aria-label={t('form.layover.directBack')}
            />
            {t('form.layover.directBack')}
          </label>
          
          {!formData.isDirectBack && (
            <div className={styles.layoverFields}>
              <div className={styles.layoverField}>
                <label className={styles.label}>
                  {t('form.layover.cityBack')}
                  <input
                    type="text"
                    name="layoverCityBack"
                    value={formData.layoverCityBack || ''}
                    onChange={handleChange}
                    placeholder={t('form.layover.cityBackPlaceholder')}
                    className={styles.layoverInput}
                    aria-label={t('form.layover.cityBack')}
                  />
                </label>
              </div>
              
              <div className={styles.layoverField}>
                <label className={styles.label}>
                  {t('form.layover.duration')}
                  <input
                    type="number"
                    name="layoverDurationBack"
                    value={formData.layoverDurationBack || 60}
                    onChange={handleChange}
                    min="30"
                    max="1440"
                    className={styles.layoverInput}
                    aria-label={t('form.layover.duration')}
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
