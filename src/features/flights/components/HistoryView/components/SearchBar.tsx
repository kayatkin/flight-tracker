import React from 'react';
import { t, ticketWord, type MessageKey } from '@shared/i18n';
import { Flight } from '@shared/types';
import { downloadFlightsCsv } from '@shared/utils';
import { toast } from '@shared/ui/Toast';
import { HISTORY_SORT_OPTIONS, isHistorySort, type HistorySort } from '../utils/historyViewHelpers';
import styles from '../HistoryView.module.css';

const SORT_LABELS: Record<HistorySort, MessageKey> = {
  route: 'history.sortRoute',
  'price-asc': 'history.sortCheap',
  'found-desc': 'history.sortNew',
  'found-asc': 'history.sortOld',
};

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
      toast(t('history.noExport'), 'warning');
      return;
    }
    void downloadFlightsCsv(visibleFlights)
      .then(() => {
        toast(
          isFiltering
            ? t('history.downloadedFound', { count: visibleCount })
            : t('history.downloadedAll', { count: visibleCount }),
          'success'
        );
      })
      .catch(() => {
        toast(t('history.exportFailed'), 'error');
      });
  };

  return (
    <div className={styles.searchContainer}>
      <input
        type="search"
        placeholder={t('history.searchPlaceholder')}
        aria-label={t('history.searchAria')}
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
          aria-label={t('history.sortAria')}
        >
          {HISTORY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {t(SORT_LABELS[option.value])}
            </option>
          ))}
        </select>
        <div className={styles.toolbarMeta}>
          <span
            className={styles.flightCount}
            title={
              isFiltering
                ? t('history.foundOf', { visible: visibleCount, total: totalFlights })
                : t('history.totalTickets', { total: totalFlights })
            }
          >
            {isFiltering ? (
              <>
                <strong>{visibleCount}</strong>{' '}
                {t('history.foundOutOf', { total: totalFlights })}
              </>
            ) : (
              <>
                <strong>{totalFlights}</strong>{' '}
                <span className={styles.ticketWord}>{ticketWord(totalFlights)}</span>
              </>
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
                  ? t('history.exportFound')
                  : t('history.exportAll')
              }
              aria-label={
                isFiltering
                  ? t('history.exportFound')
                  : t('history.exportAll')
              }
            >
              <span aria-hidden="true">⬇️</span>
              CSV
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
