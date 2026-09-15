import { t } from '@shared/i18n';
import { loadUsdRubRates } from '@services/cbrUsd';
import { Flight } from '../types';
import { toDottedDate, toLocalISODate } from './date';
import { formatExcelNumber, rubToUsd } from './fx';

const CSV_SEP = ';';

type CsvColumn =
  | keyof Flight
  | 'pricePerPerson'
  | 'totalUsd'
  | 'usdPerPerson'
  | 'usdRate';

const CSV_COLUMNS: { key: CsvColumn; header: string }[] = [
  { key: 'origin', header: t('csv.origin') },
  { key: 'destination', header: t('csv.destination') },
  { key: 'type', header: t('csv.type') },
  { key: 'departureDate', header: t('csv.departureDate') },
  { key: 'returnDate', header: t('csv.returnDate') },
  { key: 'airline', header: t('csv.airline') },
  { key: 'passengers', header: t('csv.passengers') },
  { key: 'totalPrice', header: t('csv.totalPrice') },
  { key: 'totalUsd', header: t('csv.totalUsd') },
  { key: 'pricePerPerson', header: t('csv.pricePerPerson') },
  { key: 'usdPerPerson', header: t('csv.usdPerPerson') },
  { key: 'usdRate', header: t('csv.usdRate') },
  { key: 'dateFound', header: t('csv.dateFound') },
  { key: 'notes', header: t('csv.notes') },
];

const csvCell = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const dateCell = (iso: unknown): string =>
  typeof iso === 'string' && iso ? toDottedDate(iso) : '';

const cellFor = (
  flight: Flight,
  key: CsvColumn,
  usdRub: number | undefined,
): string | number => {
  if (key === 'pricePerPerson') {
    const passengers = Number(flight.passengers) || 1;
    return formatExcelNumber(Math.round(flight.totalPrice / passengers));
  }
  if (key === 'totalPrice') {
    return formatExcelNumber(flight.totalPrice);
  }
  if (key === 'totalUsd') {
    const usd = usdRub == null ? null : rubToUsd(flight.totalPrice, usdRub);
    return usd == null ? '' : formatExcelNumber(usd, 2);
  }
  if (key === 'usdPerPerson') {
    const passengers = Number(flight.passengers) || 1;
    const usd = usdRub == null ? null : rubToUsd(flight.totalPrice / passengers, usdRub);
    return usd == null ? '' : formatExcelNumber(usd, 2);
  }
  if (key === 'usdRate') {
    return usdRub == null ? '' : formatExcelNumber(usdRub, 4);
  }
  if (key === 'type') {
    return flight.type === 'roundTrip' ? t('csv.roundTrip') : t('csv.oneWay');
  }
  if (key === 'departureDate' || key === 'returnDate' || key === 'dateFound') {
    return dateCell(flight[key]);
  }
  const value = flight[key as keyof Flight];
  return value == null ? '' : (value as string | number);
};

export type UsdRateLookup = (isoDate: string) => number | undefined;

export const flightsToCsv = (flights: Flight[], usdRate?: UsdRateLookup): string => {
  const header = CSV_COLUMNS.map((column) => csvCell(column.header)).join(CSV_SEP);
  const rows = flights.map((flight) =>
    CSV_COLUMNS.map((column) =>
      csvCell(cellFor(flight, column.key, usdRate?.(flight.dateFound)))
    ).join(CSV_SEP)
  );
  return `\uFEFFsep=${CSV_SEP}\r\n${[header, ...rows].join('\r\n')}`;
};

export const buildCsvFilename = (scope?: string): string => {
  const date = toLocalISODate();
  if (!scope?.trim()) return `flight-tracker-${date}.csv`;
  const slug = scope
    .replace(/\s*[→]\s*/g, '-')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `flight-tracker-${slug || 'route'}-${date}.csv`;
};

export const downloadFlightsCsv = async (flights: Flight[], scope?: string): Promise<void> => {
  let rates = new Map<string, number>();
  try {
    rates = await loadUsdRubRates(flights.map((flight) => flight.dateFound));
  } catch {
    // CSV still downloads; USD columns stay empty if ЦБ is unreachable.
  }
  const csv = flightsToCsv(flights, (isoDate) => rates.get(isoDate));
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildCsvFilename(scope);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
