import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = ['ru', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'flight_tracker_lang';

export const getStoredLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return 'ru';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ru') return stored;
  const browser = navigator.language.toLowerCase();
  return browser.startsWith('ru') ? 'ru' : 'en';
};

export const setStoredLanguage = (lang: AppLanguage): void => {
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
};

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language;

export default i18n;
