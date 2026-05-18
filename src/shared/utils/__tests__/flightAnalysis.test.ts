import { analyzeFlightPrice, FlightAnalysis } from '../flightAnalysis';
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
  it('сообщает о первом предложении, если нет существующих рейсов', () => {
    const result = analyzeFlightPrice(makeFlight(), []);
    expect(result.type).toBe('good');
    expect(result.message).toBe('Первое предложение по этому маршруту! Сохранено.');
  });

  it('сообщает о первом предложении, если нет сопоставимых рейсов (разные города)', () => {
    const existing = [
      makeFlight({ origin: 'Paris', destination: 'London' }),
    ];
    const result = analyzeFlightPrice(makeFlight(), existing);
    expect(result.type).toBe('good');
  });

  it('сообщает о первом предложении при разном количестве пассажиров', () => {
    const existing = [
      makeFlight({ passengers: 2 }),
    ];
    const result = analyzeFlightPrice(makeFlight({ passengers: 1 }), existing);
    expect(result.type).toBe('good');
  });

  it('сообщает о первом предложении при разном типе рейса', () => {
    const existing = [
      makeFlight({ type: 'roundTrip' }),
    ];
    const result = analyzeFlightPrice(makeFlight({ type: 'oneWay' }), existing);
    expect(result.type).toBe('good');
  });

  it('находит выгодное предложение (дешевле > 500 ₽)', () => {
    const existing = [
      makeFlight({ id: 'old', totalPrice: 20000 }),
    ];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 15000 }), existing);
    expect(result.type).toBe('good');
    expect(result.diff).toBe(-5000);
    expect(result.message).toContain('5000');
  });

  it('определяет нейтральную цену (разница в пределах 500 ₽)', () => {
    const existing = [
      makeFlight({ id: 'old', totalPrice: 15100 }),
    ];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 15000 }), existing);
    expect(result.type).toBe('neutral');
    expect(result.message).toContain('-100');
  });

  it('определяет нейтральную цену (дороже в пределах 500 ₽)', () => {
    const existing = [
      makeFlight({ id: 'old', totalPrice: 14000 }),
    ];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 14400 }), existing);
    expect(result.type).toBe('neutral');
    expect(result.message).toContain('+400');
  });

  it('находит невыгодное предложение (дороже > 500 ₽)', () => {
    const existing = [
      makeFlight({ id: 'old', totalPrice: 10000 }),
    ];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 12000 }), existing);
    expect(result.type).toBe('bad');
    expect(result.diff).toBe(2000);
    expect(result.message).toContain('2000');
  });

  it('сравнивает с лучшим из нескольких существующих рейсов', () => {
    const existing = [
      makeFlight({ id: 'a', totalPrice: 18000 }),
      makeFlight({ id: 'b', totalPrice: 12000 }),
      makeFlight({ id: 'c', totalPrice: 15000 }),
    ];
    const result = analyzeFlightPrice(makeFlight({ totalPrice: 13000 }), existing);
    // Лучший: 12000, diff = +1000 > 500 => bad
    expect(result.type).toBe('bad');
    expect(result.diff).toBe(1000);
  });
});