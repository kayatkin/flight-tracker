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

