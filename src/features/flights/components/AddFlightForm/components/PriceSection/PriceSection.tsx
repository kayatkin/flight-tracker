import React, { useMemo, useState, useEffect } from 'react';
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
  const [displayValue, setDisplayValue] = useState('');

  // Форматируем значение для отображения
  const formatPrice = (value: string) => {
    if (!value) return '';
    const number = Number(value.replace(/\s/g, ''));
    return isNaN(number) ? '' : number.toLocaleString('ru-RU');
  };

  // При изменении formData.totalPrice форматируем отображаемое значение
  useEffect(() => {
    if (formData.totalPrice) {
      setDisplayValue(formatPrice(formData.totalPrice));
    } else {
      setDisplayValue('');
    }
  }, [formData.totalPrice]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Убираем все нецифровые символы, кроме пробелов для форматирования
    const rawValue = inputValue.replace(/[^\d]/g, '');
    
    // Обновляем состояние формы
    updateFormData({ totalPrice: rawValue });
    
    // Форматируем для отображения
    if (rawValue) {
      const number = Number(rawValue);
      setDisplayValue(number.toLocaleString('ru-RU'));
    } else {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    // При потере фокуса убедимся, что значение правильно отформатировано
    if (formData.totalPrice) {
      const number = Number(formData.totalPrice);
      setDisplayValue(number.toLocaleString('ru-RU'));
    }
  };

  const pricePerPerson = useMemo(() => {
    if (!formData.totalPrice || formData.passengers <= 0) return 0;
    return Math.round(Number(formData.totalPrice) / formData.passengers);
  }, [formData.totalPrice, formData.passengers]);

  const formattedPricePerPerson = useMemo(() => {
    if (pricePerPerson === 0) return '';
    return pricePerPerson.toLocaleString('ru-RU') + ' ₽';
  }, [pricePerPerson]);

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>💰 Стоимость</h4>
      
      <div className={styles.priceContainer}>
        {/* Основное поле ввода с форматированием */}
        <div className={styles.mainInputContainer}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              name="totalPrice"
              value={displayValue}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="12 500"
              inputMode="numeric"
              className={styles.input}
              aria-label="Общая стоимость билета в рублях"
            />
            <span className={styles.currency}>₽</span>
          </div>
        </div>

        {/* Стоимость на человека (только если пассажиров > 1 и есть общая стоимость) */}
        {formData.totalPrice && formData.passengers > 1 && (
          <div className={styles.perPersonBlock}>
            <div className={styles.perPersonLabel}>На человека:</div>
            <div className={styles.perPersonValue}>
              {formattedPricePerPerson}
            </div>
          </div>
        )}

        {/* Для одного пассажира показываем подсказку */}
        {formData.totalPrice && formData.passengers === 1 && (
          <div className={styles.singlePassengerNote}>
            <span className={styles.noteIcon}>💡</span>
            Вы летите один, поэтому общая стоимость = стоимость на человека
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceSection;