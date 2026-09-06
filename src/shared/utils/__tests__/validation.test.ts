import { validateFlightForm, validateRoundTripDates } from '../validation';

describe('validateFlightForm', () => {
  const validFormData = {
    origin: 'Moscow',
    destination: 'Istanbul',
    type: 'oneWay' as const,
    departureDate: '2026-06-15',
    returnDate: '',
    totalPrice: '15000',
    airline: 'S7',
  };

  it('возвращает пустой массив для корректных данных (oneWay)', () => {
    const errors = validateFlightForm(validFormData);
    expect(errors).toEqual([]);
  });

  it('возвращает пустой массив для корректных данных (roundTrip)', () => {
    const errors = validateFlightForm({
      ...validFormData,
      type: 'roundTrip',
      returnDate: '2026-06-30',
    });
    expect(errors).toEqual([]);
  });

  it('требует origin', () => {
    const errors = validateFlightForm({ ...validFormData, origin: '' });
    expect(errors).toContain('Укажите города вылета и назначения');
  });

  it('требует destination', () => {
    const errors = validateFlightForm({ ...validFormData, destination: '' });
    expect(errors).toContain('Укажите города вылета и назначения');
  });

  it('требует departureDate', () => {
    const errors = validateFlightForm({ ...validFormData, departureDate: '' });
    expect(errors).toContain('Укажите дату вылета');
  });

  it('требует returnDate для roundTrip', () => {
    const errors = validateFlightForm({
      ...validFormData,
      type: 'roundTrip',
      returnDate: '',
    });
    expect(errors).toContain('Укажите дату возвращения');
  });

  it('не требует returnDate для oneWay', () => {
    const errors = validateFlightForm({
      ...validFormData,
      type: 'oneWay',
      returnDate: '',
    });
    expect(errors).not.toContain('Укажите дату возвращения');
  });

  it('отклоняет нулевую цену', () => {
    const errors = validateFlightForm({ ...validFormData, totalPrice: '0' });
    expect(errors).toContain('Укажите корректную стоимость (только цифры, больше 0)');
  });

  it('отклоняет отрицательную цену', () => {
    const errors = validateFlightForm({ ...validFormData, totalPrice: '-500' });
    expect(errors).toContain('Укажите корректную стоимость (только цифры, больше 0)');
  });

  it('отклоняет пустую цену', () => {
    const errors = validateFlightForm({ ...validFormData, totalPrice: '' });
    expect(errors).toContain('Укажите корректную стоимость (только цифры, больше 0)');
  });

  it('отклоняет города из одних пробелов', () => {
    const errors = validateFlightForm({ ...validFormData, origin: '   ' });
    expect(errors).toContain('Укажите города вылета и назначения');
  });

  it('отклоняет Infinity как цену', () => {
    const errors = validateFlightForm({ ...validFormData, totalPrice: 'Infinity' });
    expect(errors).toContain('Укажите корректную стоимость (только цифры, больше 0)');
  });

  it('требует авиакомпанию, если поле передано', () => {
    const errors = validateFlightForm({ ...validFormData, airline: '  ' });
    expect(errors).toContain('Укажите авиакомпанию');
  });

  it('собирает несколько ошибок одновременно', () => {
    const errors = validateFlightForm({
      origin: '',
      destination: '',
      type: 'roundTrip',
      departureDate: '',
      returnDate: '',
      totalPrice: '',
    });
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('validateRoundTripDates', () => {
  it('возвращает true когда дата возврата позже даты прилёта', () => {
    const result = validateRoundTripDates(
      '2026-06-15',
      '10:00',
      false,
      '2026-06-20',
      '15:00'
    );
    expect(result).toBe(true);
  });

  it('возвращает true когда прилёт на следующий день, но дата возврата всё ещё позже', () => {
    const result = validateRoundTripDates(
      '2026-06-15',
      '22:00',
      true, // arrival next day = 2026-06-16 22:00
      '2026-06-17',
      '08:00' // return departure = 2026-06-17 08:00
    );
    expect(result).toBe(true);
  });

  it('возвращает false когда дата возврата раньше даты прилёта', () => {
    const result = validateRoundTripDates(
      '2026-06-15',
      '10:00',
      false,
      '2026-06-14',
      '15:00'
    );
    expect(result).toBe(false);
  });

  it('возвращает false когда дата возврата совпадает, но время раньше', () => {
    const result = validateRoundTripDates(
      '2026-06-15',
      '14:00',
      false,
      '2026-06-15',
      '10:00'
    );
    expect(result).toBe(false);
  });

  it('использует 00:00 по умолчанию если время не указано', () => {
    const result = validateRoundTripDates(
      '2026-06-15',
      '',
      false,
      '2026-06-15',
      ''
    );
    // Оба: 2026-06-15T00:00 — не больше, ожидаем false
    expect(result).toBe(false);
  });
});