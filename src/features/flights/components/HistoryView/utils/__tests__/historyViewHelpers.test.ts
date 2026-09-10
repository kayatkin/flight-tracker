import { describe, it, expect } from 'vitest';
import { formatPassengerCount, groupFlightsByDestination, readHistorySearch, restoreFlightList, textMatchesQuery, writeHistorySearch, HISTORY_SEARCH_STORAGE_KEY } from '../historyViewHelpers';
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
