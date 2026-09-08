import React from 'react';
import { Flight } from '@shared/types';
import { downloadFlightsCsv } from '@shared/utils';
import styles from '../HistoryView.module.css';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalFlights: number;
  flights: Flight[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  totalFlights,
  flights,
}) => {
  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        placeholder="Поиск по городу..."
        aria-label="Поиск по городам и авиакомпаниям"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />
      <div className={styles.searchToolbar}>
        <div className={styles.flightCount}>
          Всего билетов: <strong>{totalFlights}</strong>
        </div>
        {flights.length > 0 && (
          <button
            type="button"
            className={styles.exportButton}
            onClick={() => downloadFlightsCsv(flights)}
            aria-label="Экспортировать историю в CSV"
          >
            ⬇️ CSV
          </button>
        )}
      </div>
    </div>
  );
};
