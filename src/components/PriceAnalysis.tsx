// src/components/PriceAnalysis.tsx
import React from 'react';
import styles from './PriceAnalysis.module.css';

export interface PriceAnalysisProps {
  type: 'good' | 'neutral' | 'bad';
  message: string;
  diff?: number;
}

const PriceAnalysis: React.FC<PriceAnalysisProps> = ({ type, message, diff }) => {
  const getIcon = () => {
    switch (type) {
      case 'good': return '✅';
      case 'neutral': return '⚖️';
      case 'bad': return '⚠️';
      default: return '';
    }
  };

  return (
    <div 
      className={`${styles.analysis} ${styles[`analysis${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.message}>
        <span className={styles.icon}>{getIcon()}</span>
        {message}
      </div>
      {diff !== undefined && (
        <div className={styles.diff}>
          Разница: {diff > 0 ? '+' : ''}{diff} ₽
        </div>
      )}
    </div>
  );
};

export default PriceAnalysis;