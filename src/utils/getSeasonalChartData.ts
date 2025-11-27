// src/utils/getSeasonalChartData.ts
import { Flight } from '../types';
import { ChartData, ChartOptions } from 'chart.js';

const MONTHS = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

export const getSeasonalChartData = (flights: Flight[]): ChartData<'line'> => {
  // Инициализируем данные по месяцам (0–11)
  const oneWay: (number | null)[] = Array(12).fill(null);
  const roundTrip: (number | null)[] = Array(12).fill(null);

  // Обрабатываем каждый билет
  flights.forEach(flight => {
    const pricePerPerson = flight.totalPrice / flight.passengers;
    const departureMonth = new Date(flight.departureDate).getMonth(); // 0 = Jan

    if (flight.type === 'oneWay') {
      oneWay[departureMonth] = Math.min(oneWay[departureMonth] ?? Infinity, pricePerPerson);
    } else if (flight.type === 'roundTrip') {
      roundTrip[departureMonth] = Math.min(roundTrip[departureMonth] ?? Infinity, pricePerPerson);
    }
  });

  return {
    labels: MONTHS,
    datasets: [
      {
        label: 'Туда',
        data: oneWay,
        borderColor: 'rgba(255, 99, 132, 1)', // 🔴 красный
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
      },
      {
        label: 'Туда-обратно',
        data: roundTrip,
        borderColor: 'rgba(54, 162, 235, 1)', // 🔵 синий
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
      }
    ]
  };
};

export const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const val = context.parsed.y;
          if (val === null) return 'Нет данных';
          return `${context.dataset.label}: ${Math.round(val)} ₽`;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: 'Цена на человека (₽)'
      }
    },
    x: {
      title: {
        display: true,
        text: 'Месяц вылета'
      }
    }
  }
};