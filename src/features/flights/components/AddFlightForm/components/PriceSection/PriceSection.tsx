import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const [displayValue, setDisplayValue] = useState('');
  const numberLocale = i18n.language === 'en' ? 'en-US' : 'ru-RU';

  const formatPrice = (value: string) => {
    if (!value) return '';
    const number = Number(value.replace(/\s/g, ''));
    return isNaN(number) ? '' : number.toLocaleString(numberLocale);
  };

  useEffect(() => {
    if (formData.totalPrice) {
      setDisplayValue(formatPrice(formData.totalPrice));
    } else {
      setDisplayValue('');
    }
  }, [formData.totalPrice, numberLocale]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const rawValue = inputValue.replace(/[^\d]/g, '');
    
    updateFormData({ totalPrice: rawValue });
    
    if (rawValue) {
      const number = Number(rawValue);
      setDisplayValue(number.toLocaleString(numberLocale));
    } else {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    if (formData.totalPrice) {
      const number = Number(formData.totalPrice);
      setDisplayValue(number.toLocaleString(numberLocale));
    }
  };

  const pricePerPerson = useMemo(() => {
    if (!formData.totalPrice || formData.passengers <= 0) return 0;
    return Math.round(Number(formData.totalPrice) / formData.passengers);
  }, [formData.totalPrice, formData.passengers]);

  const formattedPricePerPerson = useMemo(() => {
    if (pricePerPerson === 0) return '';
    return pricePerPerson.toLocaleString(numberLocale) + ' ₽';
  }, [pricePerPerson, numberLocale]);

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>💰 {t('form.price.title')}</h4>
      
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
              aria-label={t('form.price.totalLabel')}
            />
            <span className={styles.currency}>₽</span>
          </div>
        </div>

        {formData.totalPrice && formData.passengers > 1 && (
          <div className={styles.perPersonBlock}>
            <div className={styles.perPersonLabel}>{t('form.price.perPerson')}</div>
            <div className={styles.perPersonValue}>
              {formattedPricePerPerson}
            </div>
          </div>
        )}

        {formData.totalPrice && formData.passengers === 1 && (
          <div className={styles.singlePassengerNote}>
            <span className={styles.noteIcon}>💡</span>
            {t('form.price.soloHint')}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceSection;
