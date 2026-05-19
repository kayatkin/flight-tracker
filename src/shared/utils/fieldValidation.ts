import { KNOWN_AIRLINES } from '../data/airlines';
import { KNOWN_CITIES } from '../data/cities';

const normalize = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

const buildLookup = (items: readonly string[]): Set<string> =>
  new Set(items.map((item) => normalize(item)));

const cityLookup = buildLookup(KNOWN_CITIES);
const airlineLookup = buildLookup(KNOWN_AIRLINES);

const CITY_PATTERN = /^[\p{L}\p{M}\s.'-]{2,60}$/u;
const AIRLINE_PATTERN = /^[\p{L}\p{M}0-9\s.'-]{2,50}$/u;

export const isValidCityFormat = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length >= 2 && CITY_PATTERN.test(trimmed);
};

export const isValidAirlineFormat = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length >= 2 && AIRLINE_PATTERN.test(trimmed);
};

export const isKnownCity = (value: string, userHistory: string[] = []): boolean => {
  const key = normalize(value);
  if (cityLookup.has(key)) return true;
  return userHistory.some((c) => normalize(c) === key);
};

export const isKnownAirline = (value: string, userHistory: string[] = []): boolean => {
  const key = normalize(value);
  if (airlineLookup.has(key)) return true;
  return userHistory.some((a) => normalize(a) === key);
};

export const getCitySuggestions = (
  query: string,
  userHistory: string[] = [],
  limit = 5
): string[] => {
  const q = normalize(query);
  if (!q) return [];

  const pool = [...new Set([...userHistory, ...KNOWN_CITIES])];
  return pool.filter((c) => normalize(c).includes(q)).slice(0, limit);
};

export const getAirlineSuggestions = (
  query: string,
  userHistory: string[] = [],
  limit = 5
): string[] => {
  const q = normalize(query);
  if (!q) return [];

  const pool = [...new Set([...userHistory, ...KNOWN_AIRLINES])];
  return pool.filter((a) => normalize(a).includes(q)).slice(0, limit);
};
