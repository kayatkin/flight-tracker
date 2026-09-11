import { describe, it, expect } from 'vitest';
import {
  formatPassengerCount,
  groupFlightsByDestination,
  readHistorySearch,
  restoreFlightList,
  textMatchesQuery,
  writeHistorySearch,
  HISTORY_SEARCH_STORAGE_KEY,
  HISTORY_SORT_STORAGE_KEY,
  readHistorySort,
  writeHistorySort,
  sortDestinationKeys,
  splitBestAndOthers,
  flightMatchesQuery,
} from '../historyViewHelpers';
import { Flight } from '@shared/types';

const makeFlight = (overrides: Partial<Flight>): Flight => ({
  id: '1',
  origin: 'Moscow',
  destination: 'Paris',
  type: 'oneWay',
  departureDate: '2026-06-15',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'SU',
  passengers: 1,
  totalPrice: 10000,
  dateFound: '2026-05-01',
  ...overrides,
});

describe('groupFlightsByDestination', () => {
  it('groups by origin and destination together', () => {
    const grouped = groupFlightsByDestination([
      makeFlight({ id: '1', origin: 'Moscow', destination: 'Paris' }),
      makeFlight({ id: '2', origin: 'Tokyo', destination: 'Paris' }),
    ]);

    expect(Object.keys(grouped).sort()).toEqual(['Moscow → Paris', 'Tokyo → Paris']);
  });
});

describe('formatPassengerCount', () => {
  it('uses Russian plural forms', () => {
    expect(formatPassengerCount(1)).toBe('1 пассажир');
    expect(formatPassengerCount(2)).toBe('2 пассажира');
    expect(formatPassengerCount(5)).toBe('5 пассажиров');
  });
});

describe('textMatchesQuery', () => {
  it('matches cities and airlines without depending on letter case', () => {
    expect(textMatchesQuery('Москва', 'мос')).toBe(true);
    expect(textMatchesQuery('Аэрофлот', 'АЭРО')).toBe(true);
    expect(textMatchesQuery('S7', 's7')).toBe(true);
    expect(textMatchesQuery('Тбилиси', 'paris')).toBe(false);
  });
});

describe('history search storage', () => {
  it('reads and writes the query', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };

    expect(readHistorySearch(storage)).toBe('');
    writeHistorySearch('Москва', storage);
    expect(store.get(HISTORY_SEARCH_STORAGE_KEY)).toBe('Москва');
    expect(readHistorySearch(storage)).toBe('Москва');
    writeHistorySearch('  ', storage);
    expect(store.has(HISTORY_SEARCH_STORAGE_KEY)).toBe(false);
  });
});

describe('restoreFlightList', () => {
  it('puts a deleted ticket back once', () => {
    const ticket = makeFlight({ id: 'gone' });
    const restored = restoreFlightList([makeFlight({ id: 'keep' })], ticket);
    expect(restored.map((flight) => flight.id)).toEqual(['keep', 'gone']);
    expect(restoreFlightList(restored, ticket)).toEqual(restored);
  });
});

describe('history sort', () => {
  const memoryStorage = () => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      store,
    };
  };

  it('persists a non-default sort and drops the default', () => {
    const storage = memoryStorage();
    expect(readHistorySort(storage)).toBe('route');
    writeHistorySort('found-desc', storage);
    expect(storage.store.get(HISTORY_SORT_STORAGE_KEY)).toBe('found-desc');
    expect(readHistorySort(storage)).toBe('found-desc');
    writeHistorySort('route', storage);
    expect(storage.store.has(HISTORY_SORT_STORAGE_KEY)).toBe(false);
  });

  it('orders groups by cheapest person price or newest dateFound', () => {
    const cheap = makeFlight({ id: 'cheap', origin: 'B', destination: 'Y', totalPrice: 8000, dateFound: '2026-01-01' });
    const pricey = makeFlight({ id: 'pricey', origin: 'A', destination: 'X', totalPrice: 20000, dateFound: '2026-08-01' });
    const grouped = groupFlightsByDestination([cheap, pricey]);

    expect(sortDestinationKeys(Object.keys(grouped), grouped, 'route')).toEqual(['A → X', 'B → Y']);
    expect(sortDestinationKeys(Object.keys(grouped), grouped, 'price-asc')).toEqual(['B → Y', 'A → X']);
    expect(sortDestinationKeys(Object.keys(grouped), grouped, 'found-desc')).toEqual(['A → X', 'B → Y']);
  });

  it('keeps the cheapest ticket first and sorts the rest', () => {
    const flights = [
      makeFlight({ id: 'mid', totalPrice: 12000, dateFound: '2026-03-01' }),
      makeFlight({ id: 'best', totalPrice: 8000, dateFound: '2026-01-01' }),
      makeFlight({ id: 'new', totalPrice: 15000, dateFound: '2026-08-01' }),
    ];
    const byPrice = splitBestAndOthers(flights, 'price-asc');
    expect(byPrice.best.id).toBe('best');
    expect(byPrice.others.map((flight) => flight.id)).toEqual(['mid', 'new']);

    const byFound = splitBestAndOthers(flights, 'found-desc');
    expect(byFound.best.id).toBe('best');
    expect(byFound.others.map((flight) => flight.id)).toEqual(['new', 'mid']);
  });
});

describe('flightMatchesQuery', () => {
  it('matches an optional note', () => {
    const flight = makeFlight({ notes: 'окно у прохода' });
    expect(flightMatchesQuery(flight, 'окно')).toBe(true);
    expect(flightMatchesQuery(flight, 'Париж')).toBe(false);
  });
});
