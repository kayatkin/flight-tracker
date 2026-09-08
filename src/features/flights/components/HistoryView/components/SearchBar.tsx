import React from 'react';
import { Flight } from '@shared/types';
import { downloadFlightsCsv } from '@shared/utils';
import { toast } from '@shared/ui/Toast';
import styles from '../HistoryView.module.css';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalFlights: number;
  visibleFlights: Flight[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  totalFlights,
  visibleFlights,
}) => {
  const isFiltering = Boolean(searchTerm.trim());
  const visibleCount = visibleFlights.length;

  const handleExport = () => {
    if (visibleCount === 0) {
      toast('Нет билетов для экспорта', 'warning');
      return;
    }
    downloadFlightsCsv(visibleFlights);
    toast(
      isFiltering
        ? `Скачаны найденные билеты: ${visibleCount}`
        : `Скачана история: ${visibleCount}`,
      'success'
    );
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="search"
        placeholder="Город или авиакомпания"
        aria-label="Поиск по городам и авиакомпаниям"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />
      <div className={styles.searchToolbar}>
        <div className={styles.flightCount}>
          {isFiltering ? (
            <>Найдено: <strong>{visibleCount}</strong> из {totalFlights}</>
          ) : (
            <>Всего билетов: <strong>{totalFlights}</strong></>
          )}
        </div>
        {totalFlights > 0 && (
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExport}
            disabled={visibleCount === 0}
            aria-label="Экспортировать видимые билеты в CSV"
          >
            ⬇️ CSV
          </button>
        )}
      </div>
    </div>
  );
};
