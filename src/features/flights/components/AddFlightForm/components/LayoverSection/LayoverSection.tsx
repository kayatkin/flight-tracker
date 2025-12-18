import React from 'react';
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
      <h4 className={styles.sectionTitle}>🔄 Пересадки</h4>
      
      {/* Пересадка туда */}
      <div className={styles.layoverGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            name="isDirectThere"
            checked={formData.isDirectThere}
            onChange={handleChange}
            aria-label="Прямой рейс туда"
          />
          Прямой рейс туда
        </label>
        
        {!formData.isDirectThere && (
          <div className={styles.layoverFields}>
            <div className={styles.layoverField}>
              <label className={styles.label}>
                Город пересадки (туда)
                <input
                  type="text"
                  name="layoverCityThere"
                  value={formData.layoverCityThere || ''}
                  onChange={handleChange}
                  placeholder="Стамбул"
                  className={styles.layoverInput}
                  aria-label="Город пересадки туда"
                />
              </label>
            </div>
            
            <div className={styles.layoverField}>
              <label className={styles.label}>
                Длительность (мин)
                <input
                  type="number"
                  name="layoverDurationThere"
                  value={formData.layoverDurationThere || 60}
                  onChange={handleChange}
                  min="30"
                  max="1440"
                  className={styles.layoverInput}
                  aria-label="Длительность пересадки туда в минутах"
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
              aria-label="Прямой рейс обратно"
            />
            Прямой рейс обратно
          </label>
          
          {!formData.isDirectBack && (
            <div className={styles.layoverFields}>
              <div className={styles.layoverField}>
                <label className={styles.label}>
                  Город пересадки (обратно)
                  <input
                    type="text"
                    name="layoverCityBack"
                    value={formData.layoverCityBack || ''}
                    onChange={handleChange}
                    placeholder="Доха"
                    className={styles.layoverInput}
                    aria-label="Город пересадки обратно"
                  />
                </label>
              </div>
              
              <div className={styles.layoverField}>
                <label className={styles.label}>
                  Длительность (мин)
                  <input
                    type="number"
                    name="layoverDurationBack"
                    value={formData.layoverDurationBack || 60}
                    onChange={handleChange}
                    min="30"
                    max="1440"
                    className={styles.layoverInput}
                    aria-label="Длительность пересадки обратно в минутах"
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