// src/utils/theme.ts
import { TelegramWebApp } from '../../shared/types/telegram.d'; // ✅

// Вспомогательная функция для преобразования hex в rgb
export const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 136, 204';
};

// Создаем тип для безопасного доступа к themeParams
interface SafeThemeParams {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  }

// Функция для применения тем Telegram
export const applyTelegramTheme = (webApp: TelegramWebApp): void => {
  try {
    const themeParams: SafeThemeParams = webApp.themeParams || {};
    
    // Используем защиту типов для свойств themeParams
    const bgColor = themeParams.bg_color || '#ffffff';
    const textColor = themeParams.text_color || '#000000';
    const hintColor = themeParams.hint_color || '#999999';
    const linkColor = themeParams.link_color || '#2481cc';
    const buttonColor = themeParams.button_color || '#2481cc';
    const buttonTextColor = themeParams.button_text_color || '#ffffff';
    
    // Устанавливаем все стандартные переменные Telegram
    document.documentElement.style.setProperty('--tg-theme-bg-color', bgColor);
    document.documentElement.style.setProperty('--tg-theme-text-color', textColor);
    document.documentElement.style.setProperty('--tg-theme-hint-color', hintColor);
    document.documentElement.style.setProperty('--tg-theme-link-color', linkColor);
    document.documentElement.style.setProperty('--tg-theme-button-color', buttonColor);
    document.documentElement.style.setProperty('--tg-theme-button-text-color', buttonTextColor);
    
    // Устанавливаем производные переменные
    document.documentElement.style.setProperty('--tg-bg-color', `var(--tg-theme-bg-color, #ffffff)`);
    document.documentElement.style.setProperty('--tg-text-color', `var(--tg-theme-text-color, #000000)`);
    document.documentElement.style.setProperty('--tg-hint-color', `var(--tg-theme-hint-color, #888888)`);
    document.documentElement.style.setProperty('--tg-link-color', `var(--tg-theme-button-color, #0088cc)`);
    document.documentElement.style.setProperty('--tg-border-color', `var(--tg-theme-hint-color, #e0e0e0)`);
    document.documentElement.style.setProperty('--tg-card-bg', `var(--tg-theme-bg-color, #ffffff)`);
    document.documentElement.style.setProperty('--tg-active-bg', `rgba(${hexToRgb(buttonColor)}, 0.1)`);
    
    // Добавляем атрибут для CSS селекторов
    document.documentElement.setAttribute('data-tg-theme', 'loaded');
    
    console.log('[THEME] Telegram theme applied');
  } catch (error) {
    console.error('[THEME] Failed to apply Telegram theme:', error);
    applyDefaultTheme();
  }
};

// Функция для применения темы по умолчанию
export const applyDefaultTheme = (): void => {
  // Проверяем системную тему
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (isDarkMode) {
    // Темная тема для не-Telegram окружений
    document.documentElement.style.setProperty('--tg-bg-color', '#0f0f0f');
    document.documentElement.style.setProperty('--tg-text-color', '#ffffff');
    document.documentElement.style.setProperty('--tg-hint-color', '#aaaaaa');
    document.documentElement.style.setProperty('--tg-link-color', '#5db0ff');
    document.documentElement.style.setProperty('--tg-border-color', '#333333');
    document.documentElement.style.setProperty('--tg-card-bg', '#1c1c1c');
    document.documentElement.style.setProperty('--tg-active-bg', 'rgba(93, 176, 255, 0.1)');
  } else {
    // Светлая тема по умолчанию
    document.documentElement.style.setProperty('--tg-bg-color', '#ffffff');
    document.documentElement.style.setProperty('--tg-text-color', '#000000');
    document.documentElement.style.setProperty('--tg-hint-color', '#888888');
    document.documentElement.style.setProperty('--tg-link-color', '#0088cc');
    document.documentElement.style.setProperty('--tg-border-color', '#e0e0e0');
    document.documentElement.style.setProperty('--tg-card-bg', '#ffffff');
    document.documentElement.style.setProperty('--tg-active-bg', '#f0f8ff');
  }
  
  document.documentElement.removeAttribute('data-tg-theme');
  console.log('[THEME] Default theme applied');
};