import { t } from '@shared/i18n';
import { Flight } from '../types';
import { toLocalISODate } from './date';

const CSV_COLUMNS: { key: keyof Flight | 'pricePerPerson'; header: string }[] = [
  { key: 'origin', header: t('csv.origin') },
  { key: 'destination', header: t('csv.destination') },
  { key: 'type', header: t('csv.type') },
  { key: 'departureDate', header: t('csv.departureDate') },
  { key: 'returnDate', header: t('csv.returnDate') },
  { key: 'airline', header: t('csv.airline') },
  { key: 'passengers', header: t('csv.passengers') },
  { key: 'totalPrice', header: t('csv.totalPrice') },
  { key: 'pricePerPerson', header: t('csv.pricePerPerson') },
  { key: 'dateFound', header: t('csv.dateFound') },
  { key: 'notes', header: t('csv.notes') },
];

const csvCell = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const cellFor = (flight: Flight, key: (typeof CSV_COLUMNS)[number]['key']): string | number => {
  if (key === 'pricePerPerson') {
    const passengers = Number(flight.passengers) || 1;
    return Math.round(flight.totalPrice / passengers);
  }
  if (key === 'type') {
    return flight.type === 'roundTrip' ? t('csv.roundTrip') : t('csv.oneWay');
  }
  const value = flight[key];
  return value == null ? '' : (value as string | number);
};

export const flightsToCsv = (flights: Flight[]): string => {
  const header = CSV_COLUMNS.map((column) => csvCell(column.header)).join(',');
  const rows = flights.map((flight) =>
    CSV_COLUMNS.map((column) => csvCell(cellFor(flight, column.key))).join(',')
  );
  return `\uFEFF${[header, ...rows].join('\n')}`;
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

export const downloadFlightsCsv = (flights: Flight[], scope?: string): void => {
  const blob = new Blob([flightsToCsv(flights)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildCsvFilename(scope);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
