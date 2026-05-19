#!/usr/bin/env python3
"""One-off patches for UI i18n. Run from repo root."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "src"


def w(rel: str, content: str) -> None:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(f"Wrote {rel}")


# --- FlightCard fix ---
w(
    "features/flights/components/HistoryView/components/FlightCard.tsx",
    '''import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <motion
      key={flight.id}
      className={`${styles.fullCard} ${isBest ? styles.best : styles.normal}`}
    >
      {isBest && <motion className={styles.bestTag}>✅ {t('history.bestTag')}</motion>}

      <motion className={styles.route}>
        <strong>{flight.origin} → {flight.destination}</strong>
        {flight.type === 'roundTrip' && t('history.roundTripSuffix')}
      </motion>

      <motion className={styles.dateTime}>
        📅 {formatDateToDMY(flight.departureDate)}
        {flight.type === 'roundTrip' && flight.returnDate && ` — ${formatDateToDMY(flight.returnDate)}`}
      </motion>

      {(flight.departureTime || flight.arrivalTime) && (
        <motion className={styles.dateTime}>
          ➡️ {flight.departureTime || '—'} → {flight.arrivalTime || '—'}
          {flight.arrivalNextDay && <span style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}> (+1)</span>}
          {flight.type === 'roundTrip' && (
            <>
              <br />
              ↩️ {flight.returnDepartureTime || '—'} → {flight.returnArrivalTime || '—'}
              {flight.returnArrivalNextDay && <span style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}> (+1)</span>}
            </>
          )}
        </motion>
      )}

      <motion className={styles.layover}>{formatLayover(flight)}</motion>
      <motion className={styles.airline}>✈️ {flight.airline || '—'}</motion>

      <motion className={styles.price}>
        <Trans
          i18nKey="history.totalAndPerPerson"
          values={{
            total: formatPrice(flight.totalPrice),
            perPerson: formatPrice(flight.totalPrice / flight.passengers),
          }}
          components={{ perPerson: <strong /> }}
        />
      </motion>

      <motion className={styles.meta}>
        <span className={styles.metaText}>
          {t('history.meta', {
            count: flight.passengers,
            date: formatDateToDMY(flight.dateFound),
          })}
          {isGuest && (
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
              {guestPermissions === 'edit'
                ? ` ✏️ ${t('common.permissionsEditLabel')}`
                : ` 👁️ ${t('common.permissionsViewLabel')}`}
            </span>
          )}
        </span>
        <button
          onClick={(e) => onDelete(flight.id, e)}
          className={styles.deleteButton}
          title={canDelete ? t('history.deleteTitle') : t('history.noDeleteTitle')}
          disabled={!canDelete}
          style={!canDelete ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
        >
          🗑️
        </button>
      </motion>
    </motion>
  );
};
'''.replace("motion", "div"),
)
