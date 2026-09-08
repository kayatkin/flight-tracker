import { describe, it, expect, vi, afterEach } from 'vitest';
import { Flight } from '../../types';
import { downloadFlightsCsv, flightsToCsv } from '../flightCsv';

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

describe('flightsToCsv', () => {
  it('starts with a BOM and a Russian header row', () => {
    const csv = flightsToCsv([]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Откуда,Куда,Тип,Дата вылета,Дата обратно,Авиакомпания,Пассажиры,Цена всего,Цена на человека,Найдено');
  });

  it('maps round-trip type and price per person', () => {
    const csv = flightsToCsv([
      makeFlight({
        type: 'roundTrip',
        returnDate: '2026-06-22',
        airline: 'S7, Ural',
      }),
    ]);
    expect(csv).toContain('туда-обратно');
    expect(csv).toContain('2026-06-22');
    expect(csv).toContain('15000');
    expect(csv).toContain('"S7, Ural"');
  });
});

describe('downloadFlightsCsv', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates a csv download link', () => {
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
    URL.createObjectURL = vi.fn(() => 'blob:csv');
    URL.revokeObjectURL = vi.fn(revoke);

    downloadFlightsCsv([makeFlight()]);

    expect(link.download).toMatch(/^flight-tracker-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(link.href).toBe('blob:csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:csv');
  });
});
