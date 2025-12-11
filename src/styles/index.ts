// src/styles/index.ts
import './tokens.css';

// Экспортируем константы для использования в JavaScript если нужно
export const TOKENS = {
  colors: {
    primary: '#0088cc',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  }
} as const;

// Добавляем пустой экспорт, чтобы TypeScript считал это модулем
export {};