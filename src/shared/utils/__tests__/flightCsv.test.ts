import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Flight } from '../../types';
import { downloadFlightsCsv, flightsToCsv, buildCsvFilename } from '../flightCsv';

vi.mock('@services/cbrUsd', () => ({
  loadUsdRubRates: vi.fn(async () => new Map([['2026-05-01', 90]])),
}));

const makeFlight = (overrides: Partial<Flight> = {}): Flight => ({
  id: '1',
  origin: 'Moscow',
  destination: 'Istanbul',
  type: 'oneWay',
  departureDate: '2026-06-15',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'Turkish Airlines',
  passengers: 2,
  totalPrice: 30000,
  dateFound: '2026-05-01',
  ...overrides,
});

const csvLines = (csv: string): string[] => csv.replace(/^\uFEFF/, '').split('\r\n');

describe('flightsToCsv', () => {
  it('starts with a BOM, Excel sep hint, and semicolon columns', () => {
    const csv = flightsToCsv([]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csvLines(csv);
    expect(lines[0]).toBe('sep=;');
    expect(lines[1]).toBe(
      'Откуда;Куда;Тип;Дата вылета;Дата обратно;Авиакомпания;Пассажиры;Цена всего;Цена всего USD;Цена на человека;На человека USD;Курс ЦБ ₽/USD;Найдено;Заметка',
    );
    expect(lines[1].split(';')).toHaveLength(14);
  });

  it('maps round-trip type, dotted dates, and unquoted commas inside cells', () => {
    const csv = flightsToCsv([
      makeFlight({
        type: 'roundTrip',
        returnDate: '2026-06-22',
        airline: 'S7, Ural',
      }),
    ]);
    expect(csv).toContain('туда-обратно');
    expect(csv).toContain('15.06.2026');
    expect(csv).toContain('22.06.2026');
    expect(csv).toContain('01.05.2026');
    expect(csv).not.toContain('2026-06-22');
    expect(csv).toContain(';15000;');
    expect(csv).toContain('S7, Ural');
    expect(csv).not.toContain('"S7, Ural"');
  });

  it('quotes cells that contain the semicolon delimiter', () => {
    const csv = flightsToCsv([makeFlight({ notes: 'окно; багаж' })]);
    expect(csv).toContain('"окно; багаж"');
  });

  it('fills USD columns from the CBR rate on dateFound', () => {
    const csv = flightsToCsv([makeFlight()], (iso) => (iso === '2026-05-01' ? 90 : undefined));
    expect(csv).toContain(';333,33;');
    expect(csv).toContain(';166,67;');
    expect(csv).toContain(';90,0000;');
  });

  it('leaves USD cells empty when the rate is missing', () => {
    const csv = flightsToCsv([makeFlight()]);
    const row = csvLines(csv)[2];
    const cells = row.split(';');
    expect(cells[8]).toBe('');
    expect(cells[10]).toBe('');
    expect(cells[11]).toBe('');
  });
});

describe('downloadFlightsCsv', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates a csv download link', async () => {
    const click = vi.fn();
    const revoke = vi.fn();
    const link = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    URL.revokeObjectURL = vi.fn(revoke);

    await downloadFlightsCsv([makeFlight()]);

    expect(link.download).toMatch(/^flight-tracker-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(link.href).toBe('blob:csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:csv');
  });

  it('includes the route in the filename when exporting one destination', async () => {
    const click = vi.fn();
    const link = {
      href: '',
      download: '',
      click,
    } as unknown as HTMLAnchorElement;

    vi.spyOn(document, 'createElement').mockReturnValue(link);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    await downloadFlightsCsv([makeFlight()], 'Москва → Стамбул');

    expect(link.download).toMatch(/^flight-tracker-Москва-Стамбул-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe('buildCsvFilename', () => {
  it('uses only the date for the full history file', () => {
    expect(buildCsvFilename()).toMatch(/^flight-tracker-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(buildCsvFilename('   ')).toMatch(/^flight-tracker-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('strips characters that break filenames', () => {
    expect(buildCsvFilename('A/B:C')).toMatch(/^flight-tracker-A B C-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
