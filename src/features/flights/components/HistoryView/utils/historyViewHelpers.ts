import { Flight } from '@shared/types';
import { pluralize } from '@shared/lib/i18n/pluralize';

// Утилита: YYYY-MM-DD → DD-MM-YYYY
export const formatDateToDMY = (isoDate: string): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
};

export const formatLayover = (flight: Flight): string => {
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

export const getBestFlight = (flightList: Flight[]): Flight => {
  return flightList.reduce((best, curr) => {
    const bestPrice = best.totalPrice / best.passengers;
    const currPrice = curr.totalPrice / curr.passengers;
    return currPrice < bestPrice ? curr : best;
  });
};

export const formatPassengerCount = (count: number): string => {
  const word = pluralize(count, {
    one: 'пассажир',
    few: 'пассажира',
    many: 'пассажиров',
  });
  return `${count} ${word}`;
};

export const textMatchesQuery = (value: string, query: string): boolean => {
  const term = query.trim().toLocaleLowerCase('ru-RU');
  if (!term) return true;
  return value.toLocaleLowerCase('ru-RU').includes(term);
};

export const groupFlightsByDestination = (flights: Flight[]): Record<string, Flight[]> => {
  const groups: Record<string, Flight[]> = {};
  flights.forEach((flight) => {
    const key = `${flight.origin} → ${flight.destination}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(flight);
  });
  return groups;
};

export const HISTORY_SEARCH_STORAGE_KEY = 'flight-tracker:history-search';

export const readHistorySearch = (
  storage?: Pick<Storage, 'getItem'> | null
): string => {
  try {
    return storage?.getItem(HISTORY_SEARCH_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

export const restoreFlightList = (flights: Flight[], flight: Flight): Flight[] => {
  if (flights.some((item) => item.id === flight.id)) return flights;
  return [...flights, flight];
};

export const writeHistorySearch = (
  value: string,
  storage?: Pick<Storage, 'setItem' | 'removeItem'> | null
): void => {
  if (!storage) return;
  try {
    const next = value.trim();
    if (next) storage.setItem(HISTORY_SEARCH_STORAGE_KEY, value);
    else storage.removeItem(HISTORY_SEARCH_STORAGE_KEY);
  } catch {
    // Private mode / disabled storage
  }
};

export type HistorySort = 'route' | 'price-asc' | 'found-desc' | 'found-asc';

export const HISTORY_SORT_STORAGE_KEY = 'flight-tracker:history-sort';
export const DEFAULT_HISTORY_SORT: HistorySort = 'route';
export const HISTORY_SORT_OPTIONS: { value: HistorySort; label: string }[] = [
  { value: 'route', label: 'По маршруту' },
  { value: 'price-asc', label: 'Сначала дешёвые' },
  { value: 'found-desc', label: 'Сначала новые' },
  { value: 'found-asc', label: 'Сначала старые' },
];

export const isHistorySort = (value: string): value is HistorySort =>
  HISTORY_SORT_OPTIONS.some((option) => option.value === value);

export const readHistorySort = (
  storage?: Pick<Storage, 'getItem'> | null
): HistorySort => {
  try {
    const raw = storage?.getItem(HISTORY_SORT_STORAGE_KEY) ?? '';
    return isHistorySort(raw) ? raw : DEFAULT_HISTORY_SORT;
  } catch {
    return DEFAULT_HISTORY_SORT;
  }
};

export const writeHistorySort = (
  value: HistorySort,
  storage?: Pick<Storage, 'setItem' | 'removeItem'> | null
): void => {
  if (!storage) return;
  try {
    if (value === DEFAULT_HISTORY_SORT) storage.removeItem(HISTORY_SORT_STORAGE_KEY);
    else storage.setItem(HISTORY_SORT_STORAGE_KEY, value);
  } catch {
    // Private mode / disabled storage
  }
};

export const pricePerPerson = (flight: Flight): number => {
  const passengers = Number(flight.passengers) || 1;
  return flight.totalPrice / passengers;
};

const compareDates = (left: string, right: string): number =>
  left.localeCompare(right);

export const compareFlightsBySort = (left: Flight, right: Flight, sort: HistorySort): number => {
  if (sort === 'found-desc') {
    return compareDates(right.dateFound, left.dateFound) || pricePerPerson(left) - pricePerPerson(right);
  }
  if (sort === 'found-asc') {
    return compareDates(left.dateFound, right.dateFound) || pricePerPerson(left) - pricePerPerson(right);
  }
  return pricePerPerson(left) - pricePerPerson(right);
};

export const sortFlightsByHistorySort = (flights: Flight[], sort: HistorySort): Flight[] =>
  [...flights].sort((left, right) => compareFlightsBySort(left, right, sort));

export const splitBestAndOthers = (
  flights: Flight[],
  sort: HistorySort
): { best: Flight; others: Flight[] } => {
  const best = getBestFlight(flights);
  return {
    best,
    others: sortFlightsByHistorySort(
      flights.filter((flight) => flight.id !== best.id),
      sort
    ),
  };
};

const groupDateFound = (flights: Flight[], mode: 'min' | 'max'): string => {
  if (flights.length === 0) return '';
  return flights.reduce((current, flight) => {
    if (!current) return flight.dateFound;
    if (mode === 'max') return flight.dateFound > current ? flight.dateFound : current;
    return flight.dateFound < current ? flight.dateFound : current;
  }, '');
};

export const sortDestinationKeys = (
  destinations: string[],
  grouped: Record<string, Flight[]>,
  sort: HistorySort
): string[] => {
  const copy = [...destinations];
  copy.sort((left, right) => {
    const leftFlights = grouped[left] ?? [];
    const rightFlights = grouped[right] ?? [];
    if (sort === 'price-asc') {
      const leftPrice = Math.min(...leftFlights.map(pricePerPerson));
      const rightPrice = Math.min(...rightFlights.map(pricePerPerson));
      return leftPrice - rightPrice || left.localeCompare(right, 'ru-RU');
    }
    if (sort === 'found-desc') {
      return compareDates(groupDateFound(rightFlights, 'max'), groupDateFound(leftFlights, 'max'))
        || left.localeCompare(right, 'ru-RU');
    }
    if (sort === 'found-asc') {
      return compareDates(groupDateFound(leftFlights, 'min'), groupDateFound(rightFlights, 'min'))
        || left.localeCompare(right, 'ru-RU');
    }
    return left.localeCompare(right, 'ru-RU');
  });
  return copy;
};

export const flightMatchesQuery = (flight: Flight, query: string): boolean =>
  textMatchesQuery(flight.origin, query) ||
  textMatchesQuery(flight.destination, query) ||
  textMatchesQuery(flight.airline, query) ||
  textMatchesQuery(flight.notes ?? '', query);

