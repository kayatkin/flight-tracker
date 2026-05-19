import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        placeholder={t('history.searchPlaceholder')}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className={styles.searchInput}
      />
      <div className={styles.flightCount}>
        <Trans i18nKey="history.totalTickets" values={{ count: totalFlights }} components={{ strong: <strong /> }} />
      </div>
    </div>
  );
};
