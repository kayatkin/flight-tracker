import React from 'react';
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
import { t } from '@shared/i18n';
import { Flight } from '@shared/types';
import { getSeasonalChartData, chartOptions } from '@shared/utils';
import { useEscapeToClose } from '@shared/hooks';
import styles from './PriceChartModal.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface PriceChartModalProps {
  flights: Flight[];
  destination: string;
  onClose: () => void;
}

const PriceChartModal: React.FC<PriceChartModalProps> = ({ flights, destination, onClose }) => {
  const chartData = getSeasonalChartData(flights);
  const dialogRef = useEscapeToClose<HTMLDivElement>(onClose);

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-chart-title"
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <h3 id="price-chart-title">{t('chart.title', { destination })}</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('chart.close')}
          >
            ✕
          </button>
        </div>
        <div className={styles.chartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
        <div className={styles.legend}>
          <div>{t('chart.red')}</div>
          <div>{t('chart.blue')}</div>
          <div>{t('chart.point')}</div>
        </div>
      </div>
    </div>
  );
};

export default PriceChartModal;
