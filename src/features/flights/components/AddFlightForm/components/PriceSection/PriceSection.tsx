import React from 'react';
import { FlightFormData } from '@shared/hooks';
import styles from './PriceSection.module.css';

interface PriceSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
}

const PriceSection: React.FC<PriceSectionProps> = ({
  formData,
  updateFormData
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = e.target.value.replace(/\D/g, '');
    updateFormData({ totalPrice: numericValue });
  };

  const formatPrice = (price: string) => {
    if (!price) return '';
    return Number(price).toLocaleString('ru-RU') + ' ₽';
  };

  const pricePerPerson = formData.passengers > 0 && formData.totalPrice
    ? Math.round(Number(formData.totalPrice) / formData.passengers)
    : 0;

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>💰 Стоимость</h4>
      
      <div className={styles.priceContainer}>
        <label className={styles.label}>
          Общая стоимость билета
          <div className={styles.inputWrapper}>
            <input
              type="text"
              name="totalPrice"
              value={formData.totalPrice}
              onChange={handleChange}
              placeholder="12500"
              inputMode="numeric"
              className={styles.input}
              aria-label="Стоимость билета в рублях"
            />
            <span className={styles.currency}>₽</span>
          </div>
          {formData.totalPrice && (
            <div className={styles.formattedPrice}>
              {formatPrice(formData.totalPrice)}
            </div>
          )}
        </label>
        
        {formData.totalPrice && formData.passengers > 0 && (
          <div className={styles.priceBreakdown}>
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>На человека:</span>
              <span className={styles.breakdownValue}>
                {pricePerPerson.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <div className={styles.breakdownHint}>
              Итого: {formatPrice(formData.totalPrice)} / {formData.passengers} чел.
            </div>
          </div>
        )}
        
        <div className={styles.hint}>
          💡 Введите только цифры. Сумма будет автоматически отформатирована.
        </div>
      </div>
    </div>
  );
};

export default PriceSection;