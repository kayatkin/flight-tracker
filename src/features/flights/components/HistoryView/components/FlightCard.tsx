import React from 'react';
import { Flight } from '@shared/types';
import { formatDateToDMY, formatPrice, formatLayover } from '../utils/historyViewHelpers';
import styles from '../HistoryView.module.css';

interface FlightCardProps {
  flight: Flight;
  isBest?: boolean;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onEdit: (flight: Flight, e: React.MouseEvent) => void;
  onDuplicate: (flight: Flight, e: React.MouseEvent) => void;
  canMutate: boolean;
  isGuest: boolean;
  guestPermissions: 'view' | 'edit';
}

export const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  isBest = false,
  onDelete,
  onEdit,
  onDuplicate,
  canMutate,
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
        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={(e) => onEdit(flight, e)}
            className={styles.editButton}
            title={canMutate ? 'Изменить билет' : 'Нет прав для изменения'}
            aria-label={canMutate ? 'Изменить билет' : 'Нет прав для изменения'}
            disabled={!canMutate}
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={(e) => onDuplicate(flight, e)}
            className={styles.duplicateButton}
            title={canMutate ? 'Дублировать билет' : 'Нет прав для копирования'}
            aria-label={canMutate ? 'Дублировать билет' : 'Нет прав для копирования'}
            disabled={!canMutate}
          >
            📄
          </button>
          <button
            type="button"
            onClick={(e) => onDelete(flight.id, e)}
            className={styles.deleteButton}
            title={canMutate ? 'Удалить билет' : 'Нет прав для удаления'}
            aria-label={canMutate ? 'Удалить билет' : 'Нет прав для удаления'}
            disabled={!canMutate}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};
