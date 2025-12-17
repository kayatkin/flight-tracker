import React from 'react';
import styles from '../HistoryView.module.css';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  totalFlights: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  totalFlights,
}) => {
  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        placeholder="Поиск по городу..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />
      <div className={styles.flightCount}>
        Всего билетов: <strong>{totalFlights}</strong>
      </div>
    </div>
  );
};
