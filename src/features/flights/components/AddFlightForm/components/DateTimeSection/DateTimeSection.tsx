import React, { useMemo } from 'react';
import { FlightFormData } from '@shared/hooks';
import { toLocalISODate } from '@shared/utils/date';
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
      <h4 className={styles.sectionTitle}>📅 Дата и время</h4>
      
      <div className={styles.dateTimeGroup}>
        {/* Дата вылета */}
        <div className={styles.dateField}>
          <label className={styles.label}>
            Дата вылета
            <input
              type="date"
              name="departureDate"
              value={formData.departureDate}
              onChange={handleChange}
              min={today}
              required
              className={styles.dateInput}
              aria-label="Дата вылета"
            />
          </label>
        </div>

        {/* Время вылета и прилета */}
        <div className={styles.timeRow}>
          <div className={styles.timeField}>
            <label className={styles.label}>
              Вылет (время)
              <input
                type="time"
                name="departureTime"
                value={formData.departureTime}
                onChange={handleChange}
                className={styles.timeInput}
                aria-label="Время вылета"
              />
            </label>
          </div>
          
          <div className={styles.timeField}>
            <label className={styles.label}>
              Прилёт (время)
              <input
                type="time"
                name="arrivalTime"
                value={formData.arrivalTime}
                onChange={handleChange}
                className={styles.timeInput}
                aria-label="Время прилета"
              />
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="arrivalNextDay"
                checked={formData.arrivalNextDay}
                onChange={handleChange}
                aria-label="Прилёт на следующий день"
              />
              Прилёт на следующий день (+1)
            </label>
          </div>
        </div>

        {/* Для обратных рейсов */}
        {formData.type === 'roundTrip' && (
          <>
            <div className={styles.dateField}>
              <label className={styles.label}>
                Дата возвращения
                <input
                  type="date"
                  name="returnDate"
                  value={formData.returnDate || ''}
                  onChange={handleChange}
                  min={minReturnDate}
                  required={formData.type === 'roundTrip'}
                  className={styles.dateInput}
                  aria-label="Дата возвращения"
                />
              </label>
            </div>

            <div className={styles.timeRow}>
              <div className={styles.timeField}>
                <label className={styles.label}>
                  Обратный вылет
                  <input
                    type="time"
                    name="returnDepartureTime"
                    value={formData.returnDepartureTime || ''}
                    onChange={handleChange}
                    className={styles.timeInput}
                    aria-label="Время обратного вылета"
                  />
                </label>
              </div>
              
              <div className={styles.timeField}>
                <label className={styles.label}>
                  Обратный прилёт
                  <input
                    type="time"
                    name="returnArrivalTime"
                    value={formData.returnArrivalTime || ''}
                    onChange={handleChange}
                    className={styles.timeInput}
                    aria-label="Время обратного прилета"
                  />
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="returnArrivalNextDay"
                    checked={formData.returnArrivalNextDay}
                    onChange={handleChange}
                    aria-label="Обратный прилёт на следующий день"
                  />
                  Прилёт на следующий день (+1)
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