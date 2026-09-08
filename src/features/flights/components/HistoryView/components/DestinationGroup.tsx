import React from 'react';
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
  onEdit: (flight: Flight, e: React.MouseEvent) => void;
  onDuplicate: (flight: Flight, e: React.MouseEvent) => void;
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
  onEdit,
  onDuplicate,
}) => {
  const bestFlight = getBestFlight(flights);
  const otherFlights = flights
    .filter(f => f.id !== bestFlight.id)
    .sort((a, b) => a.totalPrice / a.passengers - b.totalPrice / b.passengers);
  
  const canMutate = !isGuest || guestPermissions === 'edit';

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
            title="График сезонности цен"
            disabled={flights.length < 2}
            style={flights.length < 2 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            📈
          </button>
        </div>

        <div className={styles.cardPrice}>
          💰 {formatPrice(bestFlight.totalPrice / bestFlight.passengers)} на человека
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
            ⭐ Лучшее предложение по цене за человека
          </div>
          <FlightCard
            key={bestFlight.id}
            flight={bestFlight}
            isBest={true}
            onDelete={onDelete}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            canMutate={canMutate}
            isGuest={isGuest}
            guestPermissions={guestPermissions}
          />
          {otherFlights.length > 0 && (
            <>
              <div className={styles.otherFlightsTitle}>
                Другие предложения ({otherFlights.length}):
              </div>
              {otherFlights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  isBest={false}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  canMutate={canMutate}
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
