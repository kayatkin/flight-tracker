// src/components/PriceChartModal.tsx
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

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>📈 Сезонность цен: {destination}</h3>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
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