import React, { useMemo, useState, useEffect } from 'react';
import { t } from '@shared/i18n';
import { FlightFormData, useUsdRubRate } from '@shared/hooks';
import { formatUsd, rubToUsd, toDottedDate } from '@shared/utils';
import styles from './PriceSection.module.css';

interface PriceSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
  fxDate: string;
  embedded?: boolean;
}

const PriceSection: React.FC<PriceSectionProps> = ({
  formData,
  updateFormData,
  fxDate,
  embedded = false,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const usdRub = useUsdRubRate(fxDate);

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

  const usdAmount = useMemo(() => {
    if (!formData.totalPrice) return null;
    const rub = Number(formData.totalPrice);
    return usdRub == null ? null : rubToUsd(rub, usdRub);
  }, [formData.totalPrice, usdRub]);

  const usdHint = useMemo(() => {
    if (usdAmount == null || !fxDate) return '';
    return t('form.usdHint', { usd: formatUsd(usdAmount), date: toDottedDate(fxDate) });
  }, [usdAmount, fxDate]);

  return (
    <div className={`${styles.section} ${embedded ? styles.embedded : ''}`}>
      <h4 className={styles.sectionTitle}>{t('form.priceTitle')}</h4>
      
      <div className={styles.priceContainer}>
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
              aria-label={t('form.priceAria')}
              title={usdHint || undefined}
            />
            <span className={styles.currency}>₽</span>
          </div>
          {usdAmount != null ? (
            <div className={styles.usdHint} title={usdHint}>
              ≈ {formatUsd(usdAmount)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PriceSection;
