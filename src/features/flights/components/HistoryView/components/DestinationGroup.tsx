import React from 'react';
import { Flight } from '@shared/types';
import { FlightCard } from './FlightCard';
import { formatPrice, formatDateToDMY, splitBestAndOthers, type HistorySort } from '../utils/historyViewHelpers';
import styles from '../HistoryView.module.css';

interface DestinationGroupProps {
  destination: string;
  flights: Flight[];
  sort: HistorySort;
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
  sort,
  isActive,
  isGuest,
  guestPermissions,
  onToggle,
  onShowChart,
  onDelete,
  onEdit,
  onDuplicate,
}) => {
  const { best: bestFlight, others: otherFlights } = splitBestAndOthers(flights, sort);
  const canMutate = !isGuest || guestPermissions === 'edit';

  const handleHeaderKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      className={[
        styles.card,
        isActive ? styles.active : '',
        isGuest && guestPermissions === 'edit' ? styles.cardGuestEdit : '',
        isGuest && guestPermissions !== 'edit' ? styles.cardGuestView : '',
      ].filter(Boolean).join(' ')}
    >
      <div
        className={styles.cardHeader}
        onClick={onToggle}
        onKeyDown={handleHeaderKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isActive}
        aria-label={`${destination}, ${flights.length} билетов`}
      >
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
        <div
          className={styles.cardContent}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
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
