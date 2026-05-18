import { getSeasonalChartData } from '../getSeasonalChartData';
import { Flight } from '../../types';

const makeFlight = (overrides: Partial<Flight> = {}): Flight => ({
  id: '1',
  origin: 'Moscow',
  destination: 'Istanbul',
  type: 'oneWay',
  departureDate: '2026-06-15',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'TK',
  passengers: 1,
  totalPrice: 15000,
  dateFound: '2026-05-01',
  ...overrides,
});

describe('getSeasonalChartData', () => {
  it('возвращает 12 меток (месяцев)', () => {
    const data = getSeasonalChartData([]);
    expect(data.labels).toHaveLength(12);
  });

  it('возвращает два набора данных: oneWay и roundTrip', () => {
    const data = getSeasonalChartData([]);
    expect(data.datasets).toHaveLength(2);
    expect(data.datasets[0].label).toBe('Туда');
    expect(data.datasets[1].label).toBe('Туда-обратно');
  });

  it('для пустого массива все значения null', () => {
    const data = getSeasonalChartData([]);
    data.datasets.forEach((ds) => {
      ds.data.forEach((val) => {
        expect(val).toBeNull();
      });
    });
  });

  it('ставит цену oneWay в правильный месяц', () => {
    const flight = makeFlight({
      type: 'oneWay',
      departureDate: '2026-03-10', // Март (месяц 2)
      passengers: 2,
      totalPrice: 30000, // 15000 на человека
    });
    const data = getSeasonalChartData([flight]);
    // Март = индекс 2, цена на человека = 15000
    expect(data.datasets[0].data[2]).toBe(15000);
    // roundTrip в том же месяце должен быть null
    expect(data.datasets[1].data[2]).toBeNull();
  });

  it('ставит цену roundTrip в правильный месяц', () => {
    const flight = makeFlight({
      type: 'roundTrip',
      departureDate: '2026-07-01', // Июль (месяц 6)
      passengers: 1,
      totalPrice: 40000,
    });
    const data = getSeasonalChartData([flight]);
    expect(data.datasets[1].data[6]).toBe(40000);
    expect(data.datasets[0].data[6]).toBeNull();
  });

  it('выбирает минимальную цену, если несколько рейсов в одном месяце', () => {
    const cheaper = makeFlight({
      id: 'cheap',
      type: 'oneWay',
      departureDate: '2026-01-15',
      passengers: 1,
      totalPrice: 10000,
    });
    const expensive = makeFlight({
      id: 'exp',
      type: 'oneWay',
      departureDate: '2026-01-25',
      passengers: 1,
      totalPrice: 18000,
    });
    const data = getSeasonalChartData([cheaper, expensive]);
    expect(data.datasets[0].data[0]).toBe(10000);
  });

  it('считает цену на человека делением на количество пассажиров', () => {
    const flight = makeFlight({
      type: 'oneWay',
      departureDate: '2026-05-01',
      passengers: 4,
      totalPrice: 60000, // 15000 на человека
    });
    const data = getSeasonalChartData([flight]);
    expect(data.datasets[0].data[4]).toBe(15000);
  });

  it('корректно задаёт цвета и свойства графика', () => {
    const data = getSeasonalChartData([]);
    expect(data.datasets[0].borderColor).toBe('rgba(255, 99, 132, 1)');
    expect(data.datasets[1].borderColor).toBe('rgba(54, 162, 235, 1)');
    expect(data.datasets[0].tension).toBe(0.3);
  });
});