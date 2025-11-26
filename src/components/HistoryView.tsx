// src/components/HistoryView.tsx
import React, { useState, useMemo } from 'react';
import { Flight } from '../types';
import styles from './HistoryView.module.css';

// Утилита: YYYY-MM-DD → DD-MM-YYYY
const formatDateToDMY = (isoDate: string): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

interface HistoryViewProps {
  flights: Flight[];
  onDelete: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ flights, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDestination, setActiveDestination] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, Flight[]> = {};
    flights.forEach((flight) => {
      const key = flight.destination;
      if (!groups[key]) groups[key] = [];
      groups[key].push(flight);
    });
    return groups;
  }, [flights]);

  const allDestinations = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const filteredDestinations = useMemo(() => {
    if (!searchTerm.trim()) return allDestinations;
    const term = searchTerm.toLowerCase();
    return allDestinations.filter(dest => dest.toLowerCase().includes(term));
  }, [searchTerm, allDestinations]);

  const getBestFlight = (flightList: Flight[]): Flight => {
    return flightList.reduce((best, curr) => {
      const bestPrice = best.totalPrice / best.passengers;
      const currPrice = curr.totalPrice / curr.passengers;
      return currPrice < bestPrice ? curr : best;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  const formatLayover = (flight: Flight) => {
    const parts: string[] = [];

    if (flight.isDirectThere) {
      parts.push('Туда: прямой');
    } else if (flight.layoverCityThere && flight.layoverDurationThere) {
      const h = Math.floor(flight.layoverDurationThere / 60);
      const m = flight.layoverDurationThere % 60;
      parts.push(`Туда: ${flight.layoverCityThere} (${h}ч ${m}м)`);
    }

    if (flight.type === 'roundTrip') {
      if (flight.isDirectBack) {
        parts.push('Обратно: прямой');
      } else if (flight.layoverCityBack && flight.layoverDurationBack) {
        const h = Math.floor(flight.layoverDurationBack / 60);
        const m = flight.layoverDurationBack % 60;
        parts.push(`Обратно: ${flight.layoverCityBack} (${h}ч ${m}м)`);
      }
    }

    return parts.join(' • ');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Удалить этот билет?')) {
      onDelete(id);
    }
  };

  const renderFullFlightCard = (flight: Flight, isBest: boolean) => {
    return (
      <div
        key={flight.id}
        className={`${styles.fullCard} ${isBest ? styles.best : styles.normal}`}
      >
        {isBest && (
          <div className={styles.bestTag}>✅ Самый выгодный</div>
        )}

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

        <div className={styles.layover}>
          {formatLayover(flight)}
        </div>

        <div className={styles.airline}>✈️ {flight.airline || '—'}</div>

        <div className={styles.price}>
          💰 Всего: {formatPrice(flight.totalPrice)} |{' '}
          <strong>{formatPrice(flight.totalPrice / flight.passengers)} на человека</strong>
        </div>

        <div className={styles.meta}>
          👥 {flight.passengers} пассажир(ов) • Найдено: {formatDateToDMY(flight.dateFound)}
        </div>

        <button
          onClick={(e) => handleDelete(flight.id, e)}
          className={styles.deleteButton}
          title="Удалить билет"
        >
          🗑️
        </button>
      </div>
    );
  };

  if (flights.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>📭 Нет сохранённых билетов.</p>
        <p>Добавьте первый рейс во вкладке «➕ Добавить»!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="🔍 Поиск по городу..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>📍</span>
      </div>

      {filteredDestinations.length === 0 && searchTerm ? (
        <div className={styles.noResults}>
          Ничего не найдено по запросу «{searchTerm}»
        </div>
      ) : (
        <div className={styles.cardList}>
          {filteredDestinations.map((destination) => {
            const flightList = grouped[destination];
            const bestFlight = getBestFlight(flightList);
            const otherFlights = flightList
              .filter(f => f.id !== bestFlight.id)
              .sort((a, b) => a.totalPrice / a.passengers - b.totalPrice / b.passengers);

            const isActive = activeDestination === destination;

            return (
              <div
                key={destination}
                onClick={() => setActiveDestination(isActive ? null : destination)}
                className={`${styles.card} ${isActive ? styles.active : ''}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>📍 {destination}</div>
                  <div className={styles.cardSubtitle}>
                    {flightList.length} билет{flightList.length === 1 ? '' : 'ов'}
                  </div>
                  <div className={styles.cardPrice}>
                    💰 {formatPrice(bestFlight.totalPrice / bestFlight.passengers)} на человека
                  </div>
                  <div className={styles.cardDate}>
                    📅 {formatDateToDMY(bestFlight.departureDate)}
                    {bestFlight.type === 'roundTrip' && bestFlight.returnDate && ` — ${formatDateToDMY(bestFlight.returnDate)}`}
                  </div>
                </div>

                {isActive && (
                  <div className={styles.cardContent}>
                    <div>{renderFullFlightCard(bestFlight, true)}</div>
                    {otherFlights.length > 0 && (
                      <>
                        <div className={styles.otherFlightsTitle}>Другие предложения:</div>
                        {otherFlights.map((flight) => renderFullFlightCard(flight, false))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryView;