import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flight } from '@shared/types';
import { FlightCard } from './FlightCard';
import { getBestFlight, formatPrice, formatDateToDMY } from '../utils/historyViewHelpers';
import styles from '../HistoryView.module.css';

interface DestinationGroupProps {
  destination: string;
  flights: Flight[];
  isActive: boolean;
  isGuest: boolean;
  guestPermissions: 'view' | 'edit';
  onToggle: () => void;
  onShowChart: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  chartsEnabled?: boolean;
}

export const DestinationGroup: React.FC<DestinationGroupProps> = ({
  destination,
  flights,
  isActive,
  isGuest,
  guestPermissions,
  onToggle,
  onShowChart,
  onDelete,
  chartsEnabled = true,
}) => {
  const { t } = useTranslation();
  const bestFlight = getBestFlight(flights);
  const otherFlights = flights
    .filter(f => f.id !== bestFlight.id)
    .sort((a, b) => a.totalPrice / a.passengers - b.totalPrice / b.passengers);
  
  const canDelete = !isGuest || (isGuest && guestPermissions === 'edit');

  return (
    <div
      onClick={onToggle}
      className={`${styles.card} ${isActive ? styles.active : ''}`}
      style={isGuest ? { borderLeft: `4px solid ${guestPermissions === 'edit' ? '#4CAF50' : '#FF9800'}` } : {}}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleWithMeta}>
          <span>📍 {destination}</span>
          <span className={styles.ticketCount}>({flights.length})</span>
          {isGuest && (
            <span className={styles.guestBadge}>
              {guestPermissions === 'edit' ? '✏️' : '👁️'}
            </span>
          )}
          <button
            className={styles.chartButton}
            onClick={(e) => {
              e.stopPropagation();
              onShowChart();
            }}
            title={chartsEnabled ? t('history.chartTitle') : t('paywall.chartsLocked')}
            disabled={flights.length < 2}
            style={
              flights.length < 2 || !chartsEnabled
                ? { opacity: 0.5, cursor: flights.length < 2 ? 'not-allowed' : 'pointer' }
                : {}
            }
          >
            {chartsEnabled ? '📈' : '🔒'}
          </button>
        </div>

        <div className={styles.cardPrice}>
          💰 {t('history.perPerson', { price: formatPrice(bestFlight.totalPrice / bestFlight.passengers) })}
        </div>
        <div className={styles.cardDate}>
          📅 {formatDateToDMY(bestFlight.departureDate)}
          {bestFlight.type === 'roundTrip' &&
            bestFlight.returnDate &&
            ` — ${formatDateToDMY(bestFlight.returnDate)}`}
        </div>
      </div>

      {isActive && (
        <div className={styles.cardContent}>
          <div className={styles.bestFlightNote}>
            ⭐ {t('history.bestOffer')}
          </div>
          <FlightCard
            flight={bestFlight}
            isBest={true}
            onDelete={onDelete}
            canDelete={canDelete}
            isGuest={isGuest}
            guestPermissions={guestPermissions}
          />
          {otherFlights.length > 0 && (
            <>
              <div className={styles.otherFlightsTitle}>
                {t('history.otherOffers', { count: otherFlights.length })}
              </div>
              {otherFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  isBest={false}
                  onDelete={onDelete}
                  canDelete={canDelete}
                  isGuest={isGuest}
                  guestPermissions={guestPermissions}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
