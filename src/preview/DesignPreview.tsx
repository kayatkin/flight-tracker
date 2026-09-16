import React from 'react';
import { HistoryView } from '@features/flights';
import { Flight } from '@shared/types';
import { t } from '@shared/i18n';
import styles from '../App.module.css';

const previewFlights: Flight[] = [
  {
    id: 'sochi-best',
    origin: 'Москва',
    destination: 'Сочи',
    type: 'roundTrip',
    departureDate: '2026-07-12',
    returnDate: '2026-07-20',
    departureTime: '09:40',
    arrivalTime: '12:05',
    returnDepartureTime: '13:10',
    returnArrivalTime: '15:30',
    isDirectThere: true,
    isDirectBack: true,
    airline: 'Аэрофлот',
    passengers: 2,
    totalPrice: 24800,
    dateFound: '2026-05-02',
    notes: 'Багаж включён',
  },
  {
    id: 'sochi-other',
    origin: 'Москва',
    destination: 'Сочи',
    type: 'oneWay',
    departureDate: '2026-07-13',
    departureTime: '18:20',
    arrivalTime: '20:50',
    isDirectThere: true,
    isDirectBack: false,
    airline: 'Победа',
    passengers: 1,
    totalPrice: 6900,
    dateFound: '2026-05-04',
  },
  {
    id: 'istanbul',
    origin: 'Санкт-Петербург',
    destination: 'Стамбул',
    type: 'oneWay',
    departureDate: '2026-08-03',
    departureTime: '06:15',
    arrivalTime: '10:40',
    arrivalNextDay: false,
    isDirectThere: true,
    isDirectBack: false,
    airline: 'Turkish Airlines',
    passengers: 1,
    totalPrice: 18750,
    dateFound: '2026-04-28',
  },
  {
    id: 'tbilisi',
    origin: 'Москва',
    destination: 'Тбилиси',
    type: 'roundTrip',
    departureDate: '2026-09-10',
    returnDate: '2026-09-17',
    departureTime: '11:00',
    arrivalTime: '15:20',
    returnDepartureTime: '16:05',
    returnArrivalTime: '18:40',
    isDirectThere: false,
    isDirectBack: true,
    layoverCityThere: 'Ереван',
    layoverDurationThere: 95,
    airline: 'Georgian Airways',
    passengers: 2,
    totalPrice: 31200,
    dateFound: '2026-05-10',
  },
];

export const DesignPreview: React.FC = () => (
  <div className={styles.app}>
    <div className={styles.previewBanner} role="status">
      {t('app.previewBanner')}
    </div>
    <h2 className={styles.title}>{t('app.title')}</h2>
    <p className={styles.greeting}>{t('app.previewSample')}</p>
    <div className={styles.tabs}>
      <button type="button" className={styles.tabButton} disabled>
        {t('app.tabAdd')}
      </button>
      <button type="button" className={`${styles.tabButton} ${styles.active}`}>
        {t('app.tabHistory')}
      </button>
    </div>
    <HistoryView
      flights={previewFlights}
      onDelete={() => undefined}
    />
  </div>
);
