// src/components/HistoryView.tsx
import React from 'react';
import { Flight } from '../types';

// Группировка билетов по городу назначения
const groupFlightsByDestination = (flights: Flight[]) => {
  const groups: Record<string, Flight[]> = {};
  flights.forEach((flight) => {
    const key = flight.destination;
    if (!groups[key]) groups[key] = [];
    groups[key].push(flight);
  });
  return groups;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
};

const formatLayover = (flight: Flight) => {
  if (flight.isDirect) return 'Прямой';
  if (flight.layoverCity && flight.layoverDuration) {
    const hours = Math.floor(flight.layoverDuration / 60);
    const mins = flight.layoverDuration % 60;
    return `Пересадка: ${flight.layoverCity} (${hours}ч ${mins}м)`;
  }
  return 'С пересадкой';
};

const getBestFlightInGroup = (flights: Flight[]): Flight | null => {
  if (flights.length === 0) return null;
  return flights.reduce((best, curr) => {
    const bestPricePer = best.totalPrice / best.passengers;
    const currPricePer = curr.totalPrice / curr.passengers;
    return currPricePer < bestPricePer ? curr : best;
  });
};

interface HistoryViewProps {
  flights: Flight[];
  onDelete: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ flights, onDelete }) => {
  if (flights.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>
        <p>📭 Пока нет сохранённых билетов.</p>
        <p>Добавьте первый рейс во вкладке «➕ Добавить»!</p>
      </div>
    );
  }

  const grouped = groupFlightsByDestination(flights);
  const destinations = Object.keys(grouped).sort();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // предотвращает срабатывание других кликов
    if (window.confirm('Вы уверены, что хотите удалить этот билет?')) {
      onDelete(id);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>📊 История по городам</h3>

      {destinations.map((destination) => {
        const flightList = grouped[destination];
        const bestFlight = getBestFlightInGroup(flightList);

        return (
          <div key={destination} style={{ marginBottom: '24px', border: '1px solid #eee', borderRadius: '8px', padding: '12px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#0088cc' }}>
              📍 {destination} ({flightList.length} билет(ов))
            </h4>

            {flightList
              .sort((a, b) => a.totalPrice / a.passengers - b.totalPrice / b.passengers)
              .map((flight) => {
                const isBest = bestFlight?.id === flight.id;
                const pricePerPerson = flight.totalPrice / flight.passengers;

                return (
                  <div
                    key={flight.id}
                    style={{
                      padding: '12px',
                      marginBottom: '12px',
                      border: isBest ? '2px solid #4caf50' : '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: isBest ? '#f1f9f1' : '#fafafa',
                      position: 'relative',
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
                      📅 {flight.departureDate}
                      {flight.type === 'roundTrip' && ` — ${flight.returnDate}`}
                    </div>

                    <div style={{ fontSize: '14px', color: '#555' }}>
                      ⏱️ {flight.departureTime} → {flight.arrivalTime}
                      {flight.type === 'roundTrip' && (
                        <>
                          <br />
                          ↩️ {flight.returnDepartureTime} → {flight.returnArrivalTime}
                        </>
                      )}
                    </div>

                    <div style={{ fontSize: '14px', color: '#666', margin: '6px 0' }}>
                      {formatLayover(flight)}
                    </div>

                    <div>✈️ {flight.airline}</div>

                    <div style={{ marginTop: '8px' }}>
                      💰 Всего: {formatPrice(flight.totalPrice)} |{' '}
                      <strong>{formatPrice(pricePerPerson)} на человека</strong>
                    </div>

                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      👥 {flight.passengers} пассажир(ов) • Найдено: {flight.dateFound}
                    </div>

                    {/* Кнопка удаления */}
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
              })}
          </div>
        );
      })}
    </div>
  );
};

export default HistoryView;