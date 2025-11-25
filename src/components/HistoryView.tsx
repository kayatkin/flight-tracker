// src/components/HistoryView.tsx
import React, { useState, useMemo } from 'react';
import { Flight } from '../types';

interface HistoryViewProps {
  flights: Flight[];
  onDelete: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ flights, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDestinations, setExpandedDestinations] = useState<Set<string>>(new Set());

  // Группировка по городу назначения
  const grouped = useMemo(() => {
    const groups: Record<string, Flight[]> = {};
    flights.forEach((flight) => {
      const key = flight.destination;
      if (!groups[key]) groups[key] = [];
      groups[key].push(flight);
    });
    return groups;
  }, [flights]);

  // Сортировка направлений по алфавиту
  const allDestinations = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  // Фильтрация по поиску
  const filteredDestinations = useMemo(() => {
    if (!searchTerm.trim()) return allDestinations;
    const term = searchTerm.toLowerCase();
    return allDestinations.filter(dest => dest.toLowerCase().includes(term));
  }, [searchTerm, allDestinations]);

  // Найти лучший билет (мин. цена на человека)
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
    if (flight.isDirect) return 'Прямой';
    if (flight.layoverCity) {
      const hours = Math.floor(flight.layoverDuration! / 60);
      const mins = flight.layoverDuration! % 60;
      return `Пересадка: ${flight.layoverCity} (${hours}ч ${mins}м)`;
    }
    return 'С пересадкой';
  };

  const toggleExpanded = (destination: string) => {
    const newSet = new Set(expandedDestinations);
    if (newSet.has(destination)) {
      newSet.delete(destination);
    } else {
      newSet.add(destination);
    }
    setExpandedDestinations(newSet);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Удалить этот билет?')) {
      onDelete(id);
    }
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
    <div style={{ padding: '0 12px' }}>
      {/* Панель поиска */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Поиск по городу назначения..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              border: '1px solid #ccc',
              borderRadius: '8px',
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
        filteredDestinations.map((destination) => {
          const flightList = grouped[destination];
          const bestFlight = getBestFlight(flightList);
          const isExpanded = expandedDestinations.has(destination);
          const otherFlights = flightList.filter(f => f.id !== bestFlight.id);

          return (
            <div
              key={destination}
              style={{
                marginBottom: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
              }}
            >
              {/* Заголовок группы */}
              <div
                onClick={() => toggleExpanded(destination)}
                style={{
                  padding: '14px 16px',
                  backgroundColor: '#f9f9f9',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '18px', color: '#0088cc' }}>📍 {destination}</strong>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {flightList.length} билет{flightList.length === 1 ? '' : 'ов'}
                  </div>
                </div>
                <span style={{ fontSize: '20px', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  ▼
                </span>
              </div>

              {/* Лучший билет (всегда виден) */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#f1f9f1',
                  borderBottom: otherFlights.length > 0 ? '1px solid #eee' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div>
                      <strong>{bestFlight.origin} → {bestFlight.destination}</strong>
                      {bestFlight.type === 'roundTrip' && ' (туда-обратно)'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#555', margin: '4px 0' }}>
                      📅 {bestFlight.departureDate}
                      {bestFlight.type === 'roundTrip' && ` — ${bestFlight.returnDate}`}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      💰 {formatPrice(bestFlight.totalPrice / bestFlight.passengers)} на человека
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(bestFlight.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f44336',
                      fontSize: '18px',
                      cursor: 'pointer',
                      flexShrink: 0,
                      marginLeft: '12px',
                    }}
                    title="Удалить лучший билет"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Остальные билеты (только если раскрыто) */}
              {isExpanded && otherFlights.length > 0 && (
                <div style={{ padding: '0 14px 14px 14px' }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      marginBottom: '10px',
                      color: '#555',
                    }}
                  >
                    Другие предложения:
                  </div>
                  {otherFlights
                    .sort((a, b) => a.totalPrice / a.passengers - b.totalPrice / b.passengers)
                    .map((flight) => (
                      <div
                        key={flight.id}
                        style={{
                          padding: '12px',
                          marginBottom: '10px',
                          border: '1px solid #eee',
                          borderRadius: '8px',
                          backgroundColor: '#fff',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div>
                              <strong>{flight.origin} → {flight.destination}</strong>
                            </div>
                            <div style={{ fontSize: '14px', color: '#555', margin: '4px 0' }}>
                              📅 {flight.departureDate}
                              {flight.type === 'roundTrip' && ` — ${flight.returnDate}`}
                            </div>
                            <div style={{ fontSize: '14px', color: '#666' }}>
                              💰 {formatPrice(flight.totalPrice / flight.passengers)} на человека
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDelete(flight.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f44336',
                              fontSize: '16px',
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginLeft: '10px',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Кнопка "Показать все / Скрыть" */}
              {otherFlights.length > 0 && (
                <div
                  onClick={() => toggleExpanded(destination)}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    color: '#0088cc',
                    cursor: 'pointer',
                    fontSize: '14px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  {isExpanded ? '▲ Скрыть остальные' : `▼ Показать ещё ${otherFlights.length}`}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default HistoryView;