import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Flight } from '@shared/types';
import styles from './HistoryView.module.css';
import { PriceChartModal } from '@features/flights';
import { DestinationGroup } from './components/DestinationGroup';
import { SearchBar } from './components/SearchBar';
import { AccessManagement } from './components/AccessManagement';
// import { GuestIndicator } from './components/GuestIndicator';
import { EmptyState } from './components/EmptyState';
import { groupFlightsByDestination, textMatchesQuery } from './utils/historyViewHelpers';
import { toast } from '@shared/ui/Toast';

interface HistoryViewProps {
  flights: Flight[];
  onDelete: (id: string) => void;
  onEdit?: (flight: Flight) => void;
  onDuplicate?: (flight: Flight) => void;
  onShare?: () => void;
  onJoin?: (token: string) => void;
  userId?: string;
  isGuest?: boolean;
  guestPermissions?: 'view' | 'edit';
}

const HistoryView: React.FC<HistoryViewProps> = ({
  flights,
  onDelete,
  onEdit,
  onDuplicate,
  onShare,
  onJoin,
  userId,
  isGuest = false,
  guestPermissions = 'view'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDestination, setActiveDestination] = useState<string | null>(null);
  const [chartDestination, setChartDestination] = useState<string | null>(null);
  const [showEmptyState, setShowEmptyState] = useState<boolean>(false);

  // Используем useMemo для оптимизации группировки
  const grouped = useMemo(() => groupFlightsByDestination(flights), [flights]);

  const allDestinations = useMemo(() => Object.keys(grouped).sort(), [grouped]);

  const filteredDestinations = useMemo(() => {
    if (!searchTerm.trim()) return allDestinations;
    return allDestinations.filter((dest) => {
      if (textMatchesQuery(dest, searchTerm)) return true;
      return grouped[dest]?.some((flight) =>
        textMatchesQuery(flight.origin, searchTerm) ||
        textMatchesQuery(flight.destination, searchTerm) ||
        textMatchesQuery(flight.airline, searchTerm)
      );
    });
  }, [searchTerm, allDestinations, grouped]);

  const visibleFlights = useMemo(
    () => filteredDestinations.flatMap((destination) => grouped[destination] ?? []),
    [filteredDestinations, grouped]
  );

  const closeChart = useCallback(() => setChartDestination(null), []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (isGuest && guestPermissions === 'view') {
      toast('У вас нет прав для удаления билетов. Только просмотр.', 'warning');
      return;
    }

    if (window.confirm('Удалить этот билет?')) {
      onDelete(id);
    }
  };

  const handleEdit = (flight: Flight, e: React.MouseEvent) => {
    e.stopPropagation();

    if (isGuest && guestPermissions === 'view') {
      toast('У вас нет прав для изменения билетов. Только просмотр.', 'warning');
      return;
    }

    onEdit?.(flight);
  };

  const handleDuplicate = (flight: Flight, e: React.MouseEvent) => {
    e.stopPropagation();

    if (isGuest && guestPermissions === 'view') {
      toast('У вас нет прав для добавления билетов. Только просмотр.', 'warning');
      return;
    }

    onDuplicate?.(flight);
  };

  // Показываем состояние пустой истории через секунду после загрузки
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEmptyState(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Если нет перелетов и показываем пустое состояние
  const isEmptyState = flights.length === 0 && showEmptyState;

  if (isEmptyState) {
    return (
      <EmptyState
        isGuest={isGuest}
        guestPermissions={guestPermissions}
        flights={flights}
        userId={userId}
        onShare={onShare}
        onJoin={onJoin}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Аккордеон управления доступом - ТОЛЬКО когда есть перелеты */}
      {!isGuest && userId && flights.length > 0 && (
        <AccessManagement
          flights={flights}
          userId={userId}
          onShare={onShare}
          onJoin={onJoin}
          isEmptyState={false}
        />
      )}

      {/* Индикатор гостевого режима */}
      {/* 
      {isGuest && (
        <GuestIndicator guestPermissions={guestPermissions} />
      )}
      */}
      {/* Основной контент */}
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        totalFlights={flights.length}
        visibleFlights={visibleFlights}
      />

      {filteredDestinations.length === 0 && searchTerm ? (
        <div className={styles.noResults}>
          Ничего не найдено по запросу «{searchTerm}»
        </div>
      ) : (
        <div className={styles.cardList}>
          {filteredDestinations.map((destination) => {
            const flightList = grouped[destination];
            
            return (
              <DestinationGroup
                key={destination}
                destination={destination}
                flights={flightList}
                isActive={activeDestination === destination}
                isGuest={isGuest}
                guestPermissions={guestPermissions}
                onToggle={() => setActiveDestination(
                  activeDestination === destination ? null : destination
                )}
                onShowChart={() => setChartDestination(destination)}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
              />
            );
          })}
        </div>
      )}

      {chartDestination && (
        <PriceChartModal
          flights={grouped[chartDestination]}
          destination={chartDestination}
          onClose={closeChart}
        />
      )}
    </div>
  );
};

export default HistoryView;