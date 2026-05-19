import { analyzeFlightPrice } from '../flightAnalysis';
import { Flight } from '../../types';

const makeFlight = (overrides: Partial<Flight> = {}): Flight => ({
  id: '1',
  origin: 'Moscow',
  destination: 'Istanbul',
  type: 'oneWay',
  departureDate: '2026-06-15',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'Turkish Airlines',
  passengers: 1,
  totalPrice: 15000,
  dateFound: '2026-05-01',
  ...overrides,
});

describe('analyzeFlightPrice', () => {
  it('returns first-route key when no existing flights', () => {
    const result = analyzeFlightPrice(makeFlight(), []);
    expect(result.type).toBe('good');
    expect(result.messageKey).toBe('priceAnalysis.firstRoute');
  });

  it('returns first-route key when no comparable flights (different cities)', () => {
    const existing = [makeFlight({ origin: 'Paris', destination: 'London' })];
    const result = analyzeFlightPrice(makeFlight(), existing);
    expect(result.type).toBe('good');
    expect(result.messageKey).toBe('priceAnalysis.firstRoute');
  });

  it('returns first-route key for different passenger count', () => {
    const existing = [makeFlight({ passengers: 2 })];
    const result = analyzeFlightPrice(makeFlight({ passengers: 1 }), existing);
    expect(result.messageKey).toBe('priceAnalysis.firstRoute');
  });

  it('returns first-route key for different trip type', () => {
    const existing = [makeFlight({ type: 'roundTrip' })];
    const result = analyzeFlightPrice(makeFlight({ type: 'oneWay' }), existing);
    expect(result.messageKey).toBe('priceAnalysis.firstRoute');
  });

  it('detects good deal (cheaper by more than threshold)', () => {
    const existing = [makeFlight({ id: 'old', totalPrice: 20000 })];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 15000 }), existing);
    expect(result.type).toBe('good');
    expect(result.diff).toBe(-5000);
    expect(result.messageKey).toBe('priceAnalysis.good');
    expect(result.messageParams?.amount).toBe(5000);
  });

  it('detects neutral price (slightly cheaper)', () => {
    const existing = [makeFlight({ id: 'old', totalPrice: 15100 })];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 15000 }), existing);
    expect(result.type).toBe('neutral');
    expect(result.messageKey).toBe('priceAnalysis.neutral');
    expect(result.messageParams?.diff).toBe(-100);
  });

  it('detects neutral price (slightly more expensive)', () => {
    const existing = [makeFlight({ id: 'old', totalPrice: 14000 })];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 14400 }), existing);
    expect(result.type).toBe('neutral');
    expect(result.messageParams?.diff).toBe(400);
  });

  it('detects bad deal (more expensive than threshold)', () => {
    const existing = [makeFlight({ id: 'old', totalPrice: 10000 })];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 12000 }), existing);
    expect(result.type).toBe('bad');
    expect(result.diff).toBe(2000);
    expect(result.messageKey).toBe('priceAnalysis.bad');
    expect(result.messageParams?.amount).toBe(2000);
  });

  it('compares against the best of multiple existing flights', () => {
    const existing = [
      makeFlight({ id: 'a', totalPrice: 18000 }),
      makeFlight({ id: 'b', totalPrice: 12000 }),
      makeFlight({ id: 'c', totalPrice: 15000 }),
    ];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 13000 }), existing);
    expect(result.type).toBe('bad');
    expect(result.diff).toBe(1000);
  });
});
