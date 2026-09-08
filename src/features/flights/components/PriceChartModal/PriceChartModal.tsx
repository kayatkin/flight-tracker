import React, { useEffect, useRef } from 'react';
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
  const chartData = getSeasonalChartData(flights);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

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
          <h3 id="price-chart-title">📈 Сезонность цен: {destination}</h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть график"
          >
            ✕
          </button>
        </div>
        <div className={styles.chartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
        <div className={styles.legend}>
          <div>Красная линия — рейсы «туда»</div>
          <div>Синяя линия — рейсы «туда-обратно»</div>
          <div>Точка = минимальная цена в этом месяце</div>
        </div>
      </div>
    </div>
  );
};

export default PriceChartModal;
