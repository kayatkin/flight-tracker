import React from 'react';
import { useTranslation } from 'react-i18next';
import { setStoredLanguage, type AppLanguage } from '@shared/lib/i18n';
import styles from './LanguageSwitcher.module.css';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const current = (i18n.language === 'en' ? 'en' : 'ru') as AppLanguage;

  const switchTo = (lang: AppLanguage) => {
    if (lang === current) return;
    setStoredLanguage(lang);
    void i18n.changeLanguage(lang);
  };

  return (
    <div className={styles.wrapper} aria-label={t('language.label')}>
      <button
        type="button"
        className={`${styles.btn} ${current === 'ru' ? styles.active : ''}`}
        onClick={() => switchTo('ru')}
      >
        RU
      </button>
      <button
        type="button"
        className={`${styles.btn} ${current === 'en' ? styles.active : ''}`}
        onClick={() => switchTo('en')}
      >
        EN
      </button>
    </div>
  );
};

