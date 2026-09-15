import { supabase } from '@shared/lib';

export interface UsdRubQuote {
  usdRub: number;
  cbrDate: string;
}

const STORAGE_KEY = 'flight-tracker:cbr-usd';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const memory = new Map<string, UsdRubQuote>();

type StoredCache = Record<string, UsdRubQuote>;

const isQuote = (value: unknown): value is UsdRubQuote =>
  !!value
  && typeof value === 'object'
  && typeof (value as UsdRubQuote).usdRub === 'number'
  && (value as UsdRubQuote).usdRub > 0
  && typeof (value as UsdRubQuote).cbrDate === 'string';

const readStored = (): StoredCache => {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredCache;
    if (!parsed || typeof parsed !== 'object') return {};
    const cache: StoredCache = {};
    for (const [isoDate, quote] of Object.entries(parsed)) {
      if (ISO_DATE.test(isoDate) && isQuote(quote)) cache[isoDate] = quote;
    }
    return cache;
  } catch {
    return {};
  }
};

const writeStored = (cache: StoredCache): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Quota or private mode — memory cache still works.
  }
};

const remember = (isoDate: string, quote: UsdRubQuote): void => {
  memory.set(isoDate, quote);
  const stored = readStored();
  stored[isoDate] = quote;
  writeStored(stored);
};

const uniqueDates = (dates: string[]): string[] => {
  const seen = new Set<string>();
  for (const value of dates) {
    const iso = value.trim();
    if (!ISO_DATE.test(iso)) continue;
    seen.add(iso);
  }
  return [...seen];
};

export const loadUsdRubRates = async (dates: string[]): Promise<Map<string, number>> => {
  const wanted = uniqueDates(dates);
  const result = new Map<string, number>();
  const missing: string[] = [];
  const stored = readStored();

  for (const isoDate of wanted) {
    const quote = memory.get(isoDate) ?? stored[isoDate];
    if (quote?.usdRub > 0) {
      memory.set(isoDate, quote);
      result.set(isoDate, quote.usdRub);
    } else {
      missing.push(isoDate);
    }
  }

  if (missing.length === 0) return result;

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    rates?: Record<string, UsdRubQuote>;
  }>('fx-usd', { body: { dates: missing } });

  if (error || !data?.rates) return result;

  for (const [isoDate, quote] of Object.entries(data.rates)) {
    if (!quote || !(quote.usdRub > 0)) continue;
    remember(isoDate, quote);
    result.set(isoDate, quote.usdRub);
  }
  return result;
};

export const resetUsdRubCacheForTests = (): void => {
  memory.clear();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
};
