// src/components/HistoryView.tsx
import React, { useState, useMemo } from 'react';
import { Flight } from '../types';

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
  
    // Туда
    if (flight.isDirectThere) {
      parts.push('Туда: прямой');
    } else if (flight.layoverCityThere && flight.layoverDurationThere) {
      const h = Math.floor(flight.layoverDurationThere / 60);
      const m = flight.layoverDurationThere % 60;
      parts.push(`Туда: ${flight.layoverCityThere} (${h}ч ${m}м)`);
    }
  
    // Обратно
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
        style={{
          padding: '14px',
          marginBottom: '12px',
          border: isBest ? '2px solid #4caf50' : '1px solid #ddd',
          borderRadius: '12px',
          backgroundColor: isBest ? '#f1f9f1' : '#fff',
          position: 'relative',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        }}
      >
        {isBest && (
          <div style={{ fontSize: '12px', color: '#2e7d32', fontWeight: 'bold', marginBottom: '6px' }}>
            ✅ Самый выгодный
          </div>
        )}

        <div>
          <strong>{flight.origin} → {flight.destination}</strong>
          {flight.type === 'roundTrip' && ' (туда-обратно)'}
        </div>

        <div style={{ fontSize: '14px', color: '#555', margin: '6px 0' }}>
          📅 {formatDateToDMY(flight.departureDate)}
          {flight.type === 'roundTrip' && flight.returnDate && ` — ${formatDateToDMY(flight.returnDate)}`}
        </div>

        {(flight.departureTime || flight.arrivalTime) && (
          <div style={{ fontSize: '14px', color: '#555' }}>
            ⏱️ {flight.departureTime || '—'} → {flight.arrivalTime || '—'}
            {flight.type === 'roundTrip' && (
              <>
                <br />
                ↩️ {flight.returnDepartureTime || '—'} → {flight.returnArrivalTime || '—'}
              </>
            )}
          </div>
        )}

        <div style={{ fontSize: '14px', color: '#666', margin: '6px 0' }}>
          {formatLayover(flight)}
        </div>

        <div>✈️ {flight.airline || '—'}</div>

        <div style={{ marginTop: '8px' }}>
          💰 Всего: {formatPrice(flight.totalPrice)} |{' '}
          <strong>{formatPrice(flight.totalPrice / flight.passengers)} на человека</strong>
        </div>

        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
          👥 {flight.passengers} пассажир(ов) • Найдено: {formatDateToDMY(flight.dateFound)}
        </div>

        <button
          onClick={(e) => handleDelete(flight.id, e)}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'none',
            border: 'none',
            color: '#f44336',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
          }}
          title="Удалить билет"
        >
          🗑️
        </button>
      </div>
    );
  };

  if (flights.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', color: '#888' }}>
        <p>📭 Нет сохранённых билетов.</p>
        <p>Добавьте первый рейс во вкладке «➕ Добавить»!</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 12px', paddingBottom: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Поиск по городу..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              border: '1px solid #ccc',
              borderRadius: '12px',
              fontSize: '16px',
              backgroundColor: '#fff',
            }}
          />
          <span style={{ position: 'absolute', left: '12px', top: '12px', color: '#888' }}>📍</span>
        </div>
      </div>

      {filteredDestinations.length === 0 && searchTerm ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
          Ничего не найдено по запросу «{searchTerm}»
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: isActive
                    ? '0 6px 20px rgba(0,0,0,0.15)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
                  border: isActive ? '1px solid #0088cc' : '1px solid #eee',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
              >
                <div style={{ padding: '16px', backgroundColor: '#f8f9fa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '18px', color: '#0088cc' }}>📍 {destination}</strong>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      {flightList.length} билет{flightList.length === 1 ? '' : 'ов'}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '15px', color: '#444' }}>
                    💰 {formatPrice(bestFlight.totalPrice / bestFlight.passengers)} на человека
                  </div>
                  <div style={{ fontSize: '14px', color: '#777', marginTop: '4px' }}>
                    📅 {formatDateToDMY(bestFlight.departureDate)}
                    {bestFlight.type === 'roundTrip' && bestFlight.returnDate && ` — ${formatDateToDMY(bestFlight.returnDate)}`}
                  </div>
                </div>

                {isActive && (
                  <div style={{ padding: '16px', paddingTop: '8px' }}>
                    <div style={{ marginBottom: '12px' }}>
                      {renderFullFlightCard(bestFlight, true)}
                    </div>
                    {otherFlights.length > 0 && (
                      <>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '12px 0 8px', color: '#555' }}>
                          Другие предложения:
                        </div>
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