import { Flight } from '../types';
import { toLocalISODate } from './date';

const CSV_COLUMNS: { key: keyof Flight | 'pricePerPerson'; header: string }[] = [
  { key: 'origin', header: 'Откуда' },
  { key: 'destination', header: 'Куда' },
  { key: 'type', header: 'Тип' },
  { key: 'departureDate', header: 'Дата вылета' },
  { key: 'returnDate', header: 'Дата обратно' },
  { key: 'airline', header: 'Авиакомпания' },
  { key: 'passengers', header: 'Пассажиры' },
  { key: 'totalPrice', header: 'Цена всего' },
  { key: 'pricePerPerson', header: 'Цена на человека' },
  { key: 'dateFound', header: 'Найдено' },
  { key: 'notes', header: 'Заметка' },
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
    return flight.type === 'roundTrip' ? 'туда-обратно' : 'туда';
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

export const downloadFlightsCsv = (flights: Flight[]): void => {
  const blob = new Blob([flightsToCsv(flights)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `flight-tracker-${toLocalISODate()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
