import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FlightFormData } from '@shared/hooks';
import styles from './DateTimeSection.module.css';

interface DateTimeSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
}

const DateTimeSection: React.FC<DateTimeSectionProps> = ({
  formData,
  updateFormData
}) => {
  const { t } = useTranslation();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
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
      <h4 className={styles.sectionTitle}>📅 {t('form.datetime.title')}</h4>
      
      <div className={styles.dateTimeGroup}>
        <div className={styles.dateField}>
          <label className={styles.label}>
            {t('form.datetime.departureDate')}
            <input
              type="date"
              name="departureDate"
              value={formData.departureDate}
              onChange={handleChange}
              min={today}
              required
              className={styles.dateInput}
              aria-label={t('form.datetime.departureDate')}
            />
          </label>
        </div>

        <div className={styles.timeRow}>
          <div className={styles.timeField}>
            <label className={styles.label}>
              {t('form.datetime.departureTime')}
              <input
                type="time"
                name="departureTime"
                value={formData.departureTime}
                onChange={handleChange}
                className={styles.timeInput}
                aria-label={t('form.datetime.departureTime')}
              />
            </label>
          </div>
          
          <div className={styles.timeField}>
            <label className={styles.label}>
              {t('form.datetime.arrivalTime')}
              <input
                type="time"
                name="arrivalTime"
                value={formData.arrivalTime}
                onChange={handleChange}
                className={styles.timeInput}
                aria-label={t('form.datetime.arrivalTime')}
              />
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="arrivalNextDay"
                checked={formData.arrivalNextDay}
                onChange={handleChange}
                aria-label={t('form.datetime.arrivalNextDay')}
              />
              {t('form.datetime.arrivalNextDay')}
            </label>
          </div>
        </div>

        {formData.type === 'roundTrip' && (
          <>
            <div className={styles.dateField}>
              <label className={styles.label}>
                {t('form.datetime.returnDate')}
                <input
                  type="date"
                  name="returnDate"
                  value={formData.returnDate || ''}
                  onChange={handleChange}
                  min={minReturnDate}
                  required={formData.type === 'roundTrip'}
                  className={styles.dateInput}
                  aria-label={t('form.datetime.returnDate')}
                />
              </label>
            </div>

            <div className={styles.timeRow}>
              <div className={styles.timeField}>
                <label className={styles.label}>
                  {t('form.datetime.returnDeparture')}
                  <input
                    type="time"
                    name="returnDepartureTime"
                    value={formData.returnDepartureTime || ''}
                    onChange={handleChange}
                    className={styles.timeInput}
                    aria-label={t('form.datetime.returnDeparture')}
                  />
                </label>
              </div>
              
              <div className={styles.timeField}>
                <label className={styles.label}>
                  {t('form.datetime.returnArrival')}
                  <input
                    type="time"
                    name="returnArrivalTime"
                    value={formData.returnArrivalTime || ''}
                    onChange={handleChange}
                    className={styles.timeInput}
                    aria-label={t('form.datetime.returnArrival')}
                  />
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="returnArrivalNextDay"
                    checked={formData.returnArrivalNextDay}
                    onChange={handleChange}
                    aria-label={t('form.datetime.arrivalNextDay')}
                  />
                  {t('form.datetime.arrivalNextDay')}
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
