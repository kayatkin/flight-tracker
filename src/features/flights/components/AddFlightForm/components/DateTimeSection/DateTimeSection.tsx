import React, { useMemo } from 'react';
import { t } from '@shared/i18n';
import { FlightFormData } from '@shared/hooks';
import { toLocalISODate } from '@shared/utils/date';
import FlightTypeSection from '../FlightTypeSection/FlightTypeSection';
import styles from './DateTimeSection.module.css';

interface DateTimeSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
}

const DateTimeSection: React.FC<DateTimeSectionProps> = ({
  formData,
  updateFormData
}) => {
  // Сегодняшняя дата для ограничения выбора
  const today = useMemo(() => toLocalISODate(), []);

  // Минимальная дата для обратного рейса
  const minReturnDate = formData.departureDate || today;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      updateFormData({ [name]: checked });
    } else {
      updateFormData({ [name]: value });
    }
  };

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>{t('form.dateTime')}</h4>
      <FlightTypeSection
        formData={formData}
        updateFormData={updateFormData}
        embedded
      />
      
      <div className={styles.dateTimeGroup}>
        {/* Дата вылета */}
        <div className={styles.dateField}>
          <label className={styles.label}>
            {t('form.departureDateLabel')}
            <input
              type="date"
              name="departureDate"
              value={formData.departureDate}
              onChange={handleChange}
              min={today}
              required
              className={styles.dateInput}
              aria-label={t('form.departureDateLabel')}
            />
          </label>
        </div>

        {/* Время вылета и прилета */}
        <div className={styles.timeRow}>
          <div className={styles.timeField}>
            <label className={styles.label}>
              {t('form.departureTime')}
              <input
                type="time"
                name="departureTime"
                value={formData.departureTime}
                onChange={handleChange}
                className={styles.timeInput}
                aria-label={t('form.departureTime')}
              />
            </label>
          </div>
          
          <div className={styles.timeField}>
            <label className={styles.label}>
              {t('form.arrivalTime')}
              <input
                type="time"
                name="arrivalTime"
                value={formData.arrivalTime}
                onChange={handleChange}
                className={styles.timeInput}
                aria-label={t('form.arrivalTime')}
              />
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="arrivalNextDay"
                checked={formData.arrivalNextDay}
                onChange={handleChange}
                aria-label={t('form.nextDay')}
              />
              {t('form.nextDay')}
            </label>
          </div>
        </div>

        {/* Для обратных рейсов */}
        {formData.type === 'roundTrip' && (
          <>
            <div className={styles.dateField}>
              <label className={styles.label}>
                {t('form.returnDateLabel')}
                <input
                  type="date"
                  name="returnDate"
                  value={formData.returnDate || ''}
                  onChange={handleChange}
                  min={minReturnDate}
                  required={formData.type === 'roundTrip'}
                  className={styles.dateInput}
                  aria-label={t('form.returnDateLabel')}
                />
              </label>
            </div>

            <div className={styles.timeRow}>
              <div className={styles.timeField}>
                <label className={styles.label}>
                  {t('form.returnDeparture')}
                  <input
                    type="time"
                    name="returnDepartureTime"
                    value={formData.returnDepartureTime || ''}
                    onChange={handleChange}
                    className={styles.timeInput}
                    aria-label={t('form.returnDeparture')}
                  />
                </label>
              </div>
              
              <div className={styles.timeField}>
                <label className={styles.label}>
                  {t('form.returnArrival')}
                  <input
                    type="time"
                    name="returnArrivalTime"
                    value={formData.returnArrivalTime || ''}
                    onChange={handleChange}
                    className={styles.timeInput}
                    aria-label={t('form.returnArrival')}
                  />
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="returnArrivalNextDay"
                    checked={formData.returnArrivalNextDay}
                    onChange={handleChange}
                    aria-label={t('form.nextDay')}
                  />
                  {t('form.nextDay')}
                </label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DateTimeSection;