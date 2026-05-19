// src/components/PriceChartModal.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Flight } from '@shared/types';
import { getSeasonalChartData, chartOptions } from '@shared/utils';
import styles from './PriceChartModal.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PriceChartModalProps {
  flights: Flight[];
  destination: string;
  onClose: () => void;
}

const PriceChartModal: React.FC<PriceChartModalProps> = ({ flights, destination, onClose }) => {
  const { t } = useTranslation();
  const chartData = getSeasonalChartData(flights);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>📈 {t('chart.title', { destination })}</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>
        <div className={styles.chartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
        <div className={styles.legend}>
          <div>{t('chart.legendOneWay')}</div>
          <div>{t('chart.legendRoundTrip')}</div>
          <div>{t('chart.legendPoint')}</div>
        </div>
      </div>
    </div>
  );
};

export default PriceChartModal;
