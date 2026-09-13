import React from 'react';
import { Flight } from '@shared/types';
import { downloadFlightsCsv } from '@shared/utils';
import { toast } from '@shared/ui/Toast';
import { HISTORY_SORT_OPTIONS, isHistorySort, type HistorySort } from '../utils/historyViewHelpers';
import styles from '../HistoryView.module.css';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sort: HistorySort;
  onSortChange: (value: HistorySort) => void;
  totalFlights: number;
  visibleFlights: Flight[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  sort,
  onSortChange,
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
        placeholder="Город, авиакомпания или заметка"
        aria-label="Поиск по городам, авиакомпаниям и заметкам"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />
      <div className={styles.searchToolbar}>
        <select
          id="history-sort"
          className={styles.sortSelect}
          value={sort}
          onChange={(event) => {
            const value = event.target.value;
            if (isHistorySort(value)) onSortChange(value);
          }}
          aria-label="Сортировка истории"
        >
          {HISTORY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span
          className={styles.flightCount}
          title={
            isFiltering
              ? `Найдено ${visibleCount} из ${totalFlights}`
              : `Всего билетов: ${totalFlights}`
          }
        >
          {isFiltering ? (
            <>
              <strong>{visibleCount}</strong>/{totalFlights}
            </>
          ) : (
            <strong>{totalFlights}</strong>
          )}
        </span>
        {totalFlights > 0 && (
          <button
            type="button"
            className={styles.exportButton}
            onClick={handleExport}
            disabled={visibleCount === 0}
            title={
              isFiltering
                ? 'Скачать найденные билеты в CSV'
                : 'Скачать все билеты на экране в CSV'
            }
            aria-label={
              isFiltering
                ? 'Скачать найденные билеты в CSV'
                : 'Скачать все билеты на экране в CSV'
            }
          >
            CSV
          </button>
        )}
      </div>
    </div>
  );
};
