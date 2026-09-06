import React from 'react';
import { Flight } from '@shared/types';
import { formatDateToDMY, formatPrice, formatLayover } from '../utils/historyViewHelpers';
import styles from '../HistoryView.module.css';

interface FlightCardProps {
  flight: Flight;
  isBest?: boolean;
  onDelete: (id: string, e: React.MouseEvent) => void;
  canDelete: boolean;
  isGuest: boolean;
  guestPermissions: 'view' | 'edit';
}

export const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  isBest = false,
  onDelete,
  canDelete,
  isGuest,
  guestPermissions,
}) => {
  return (
    <div
      key={flight.id}
      className={`${styles.fullCard} ${isBest ? styles.best : styles.normal}`}
    >
      {isBest && <div className={styles.bestTag}>✅ Самый выгодный</div>}

      <div className={styles.route}>
        <strong>{flight.origin} → {flight.destination}</strong>
        {flight.type === 'roundTrip' && ' (туда-обратно)'}
      </div>

      <div className={styles.dateTime}>
        📅 {formatDateToDMY(flight.departureDate)}
        {flight.type === 'roundTrip' && flight.returnDate && ` — ${formatDateToDMY(flight.returnDate)}`}
      </div>

      {(flight.departureTime || flight.arrivalTime) && (
        <div className={styles.dateTime}>
          ➡️ {flight.departureTime || '—'} → {flight.arrivalTime || '—'}
          {flight.arrivalNextDay && <span style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}> (+1)</span>}
          {flight.type === 'roundTrip' && (
            <>
              <br />
              ↩️ {flight.returnDepartureTime || '—'} → {flight.returnArrivalTime || '—'}
              {flight.returnArrivalNextDay && <span style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}> (+1)</span>}
            </>
          )}
        </div>
      )}

      <div className={styles.layover}>{formatLayover(flight)}</div>
      <div className={styles.airline}>✈️ {flight.airline || '—'}</div>

      <div className={styles.price}>
        💰 Всего: {formatPrice(flight.totalPrice)} |{' '}
        <strong>{formatPrice(flight.totalPrice / flight.passengers)} на человека</strong>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaText}>
          👥 {flight.passengers} пассажир(ов) • Найдено: {formatDateToDMY(flight.dateFound)}
          {isGuest && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
            {guestPermissions === 'edit' ? '✏️ Редактирование' : '👁️ Только просмотр'}
          </span>}
        </span>
        <button
          onClick={(e) => onDelete(flight.id, e)}
          className={styles.deleteButton}
          title={canDelete ? "Удалить билет" : "Нет прав для удаления"}
          aria-label={canDelete ? "Удалить билет" : "Нет прав для удаления"}
          disabled={!canDelete}
          style={!canDelete ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          🗑️
        </button>
      </div>
    </div>
  );
};
