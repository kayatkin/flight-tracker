import React, { useState, useMemo, useEffect } from 'react';
import { Flight } from '@shared/types';
import styles from './HistoryView.module.css';
import { PriceChartModal } from '@features/flights';
import { DestinationGroup } from './components/DestinationGroup';
import { SearchBar } from './components/SearchBar';
import { AccessManagement } from './components/AccessManagement';
import { GuestIndicator } from './components/GuestIndicator';
import { EmptyState } from './components/EmptyState';
import { groupFlightsByDestination } from './utils/historyViewHelpers';

interface HistoryViewProps {
  flights: Flight[];
  onDelete: (id: string) => void;
  onShare?: () => void;
  onJoin?: (token: string) => void;
  userId?: string;
  isGuest?: boolean;
  guestPermissions?: 'view' | 'edit';
}

const HistoryView: React.FC<HistoryViewProps> = ({ 
  flights, 
  onDelete, 
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
    const term = searchTerm.toLowerCase();
    return allDestinations.filter(dest => dest.toLowerCase().includes(term));
  }, [searchTerm, allDestinations]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isGuest && guestPermissions === 'view') {
      alert('У вас нет прав для удаления билетов. Только просмотр.');
      return;
    }
    
    if (window.confirm('Удалить этот билет?')) {
      onDelete(id);
    }
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
      {isGuest && (
        <GuestIndicator guestPermissions={guestPermissions} />
      )}

      {/* Основной контент */}
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        totalFlights={flights.length}
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
              />
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