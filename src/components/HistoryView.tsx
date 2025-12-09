// src/components/HistoryView.tsx
import React, { useState, useMemo } from 'react';
import { Flight } from '../types';
import styles from './HistoryView.module.css';
import PriceChartModal from './PriceChartModal';
import JoinSessionForm from './JoinSessionForm';

// Утилита: YYYY-MM-DD → DD-MM-YYYY
const formatDateToDMY = (isoDate: string): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

interface HistoryViewProps {
  flights: Flight[];
  onDelete: (id: string) => void;
  onShare?: () => void; // Функция для открытия модального окна "Поделиться"
  onJoin?: (token: string) => void; // Функция для присоединения к истории
  isGuest?: boolean; // Флаг гостевого режима
  guestPermissions?: 'view' | 'edit'; // Права гостя
}

const HistoryView: React.FC<HistoryViewProps> = ({ 
  flights, 
  onDelete, 
  onShare,
  onJoin,
  isGuest = false,
  guestPermissions = 'view'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDestination, setActiveDestination] = useState<string | null>(null);
  const [chartDestination, setChartDestination] = useState<string | null>(null);
  const [showEmptyState, setShowEmptyState] = useState<boolean>(false);
  const [showJoinForm, setShowJoinForm] = useState<boolean>(false);

  // Используем useMemo для оптимизации группировки
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
    
    // Проверяем права доступа
    if (isGuest && guestPermissions === 'view') {
      alert('У вас нет прав для удаления билетов. Только просмотр.');
      return;
    }
    
    if (window.confirm('Удалить этот билет?')) {
      onDelete(id);
    }
  };

  const handleJoin = (token: string) => {
    if (onJoin) {
      onJoin(token);
      setShowJoinForm(false);
    }
  };

  const renderFullFlightCard = (flight: Flight, isBest: boolean) => {
    const canDelete = !isGuest || (isGuest && guestPermissions === 'edit');
    
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
            onClick={(e) => handleDelete(flight.id, e)}
            className={styles.deleteButton}
            title={canDelete ? "Удалить билет" : "Нет прав для удаления"}
            disabled={!canDelete}
            style={!canDelete ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            🗑️
          </button>
        </div>
      </div>
    );
  };

  // Показываем состояние пустой истории через секунду после загрузки
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowEmptyState(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (flights.length === 0 && showEmptyState) {
    return (
      <div className={styles.emptyState}>
        <p>📭 Нет сохранённых билетов.</p>
        <p>Добавьте первый рейс во вкладке «➕ Добавить»!</p>
        {isGuest && (
          <div className={styles.guestHint}>
            <p>Вы находитесь в режиме гостя с правами <strong>{guestPermissions === 'edit' ? 'редактирования' : 'просмотра'}</strong>.</p>
            <p>Чтобы создать свою историю, перейдите по основной ссылке приложения.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Кнопки действий для владельцев */}
      {!isGuest && (
        <div className={styles.actionButtonsContainer}>
          <div className={styles.buttonGroup}>
            {onShare && (
              <button
                onClick={onShare}
                className={styles.shareButton}
                title="Поделиться историей перелетов"
              >
                📤 Поделиться
              </button>
            )}
            <button
              onClick={() => setShowJoinForm(!showJoinForm)}
              className={styles.joinHistoryButton}
              title="Присоединиться к чужой истории"
            >
              🔗 Присоединиться
            </button>
          </div>
          <p className={styles.actionHint}>
            {showJoinForm 
              ? "Введите токен доступа для просмотра чужой истории" 
              : "Управляйте доступом к вашей истории перелетов"
            }
          </p>
        </div>
      )}

      {/* Форма присоединения к истории */}
      {showJoinForm && !isGuest && onJoin && (
        <div className={styles.joinFormWrapper}>
          <JoinSessionForm
            onJoin={handleJoin}
            onCancel={() => setShowJoinForm(false)}
          />
        </div>
      )}

      {/* Индикатор гостевого режима */}
      {isGuest && (
        <div className={styles.guestIndicator}>
          <div className={styles.guestIcon}>👤</div>
          <div className={styles.guestInfo}>
            <div className={styles.guestTitle}>Режим гостя</div>
            <div className={styles.guestPermissions}>
              Права доступа: <strong>{guestPermissions === 'edit' ? '✏️ Просмотр и редактирование' : '👁️ Только просмотр'}</strong>
            </div>
          </div>
        </div>
      )}

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="🔍 Поиск по городу..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
          disabled={flights.length === 0}
        />
        <span className={styles.searchIcon}>📍</span>
        {flights.length > 0 && (
          <div className={styles.flightCount}>
            Всего билетов: <strong>{flights.length}</strong>
          </div>
        )}
      </div>

      {filteredDestinations.length === 0 && searchTerm && flights.length > 0 ? (
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
                style={isGuest ? { borderLeft: `4px solid ${guestPermissions === 'edit' ? '#4CAF50' : '#FF9800'}` } : {}}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWithMeta}>
                    <span>📍 {destination}</span>
                    <span className={styles.ticketCount}>({flightList.length})</span>
                    {isGuest && (
                      <span className={styles.guestBadge}>
                        {guestPermissions === 'edit' ? '✏️' : '👁️'}
                      </span>
                    )}
                    <button
                      className={styles.chartButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChartDestination(destination);
                      }}
                      title="График сезонности цен"
                      disabled={flightList.length < 2}
                      style={flightList.length < 2 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
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
                    <div>{renderFullFlightCard(bestFlight, true)}</div>
                    {otherFlights.length > 0 && (
                      <>
                        <div className={styles.otherFlightsTitle}>
                          Другие предложения ({otherFlights.length}):
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

      {chartDestination && (
        <PriceChartModal
          flights={grouped[chartDestination]}
          destination={chartDestination}
          onClose={() => setChartDestination(null)}
        />
      )}
    </div>
  );
};

export default HistoryView;