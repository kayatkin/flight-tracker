import { validateFlightForm, validateRoundTripDates } from '../validation';

describe('validateFlightForm', () => {
  const validFormData = {
    origin: 'Moscow',
    destination: 'Istanbul',
    type: 'oneWay' as const,
    departureDate: '2026-06-15',
    returnDate: '',
    totalPrice: '15000',
    airline: 'Aeroflot',
  };

  it('returns empty array for valid data (oneWay)', () => {
    expect(validateFlightForm(validFormData)).toEqual([]);
  });

  it('returns empty array for valid roundTrip', () => {
    expect(
      validateFlightForm({
        ...validFormData,
        type: 'roundTrip',
        returnDate: '2026-06-30',
      })
    ).toEqual([]);
  });

  it('requires origin and destination', () => {
    expect(validateFlightForm({ ...validFormData, origin: '' })).toContain(
      'validation.originDestinationRequired'
    );
  });

  it('rejects same origin and destination', () => {
    expect(
      validateFlightForm({
        ...validFormData,
        origin: 'Moscow',
        destination: 'Moscow',
      })
    ).toContain('validation.sameOriginDestination');
  });

  it('requires departureDate', () => {
    expect(validateFlightForm({ ...validFormData, departureDate: '' })).toContain(
      'validation.departureDateRequired'
    );
  });

  it('requires returnDate for roundTrip', () => {
    expect(
      validateFlightForm({
        ...validFormData,
        type: 'roundTrip',
        returnDate: '',
      })
    ).toContain('validation.returnDateRequired');
  });

  it('requires valid price', () => {
    expect(validateFlightForm({ ...validFormData, totalPrice: '0' })).toContain(
      'validation.invalidPrice'
    );
  });

  it('accepts custom city from user history', () => {
    expect(
      validateFlightForm(
        { ...validFormData, origin: 'My Home Town' },
        { originHistory: ['My Home Town'] }
      )
    ).not.toContain('validation.invalidOrigin');
  });

  it('rejects unknown city not in catalog or history', () => {
    expect(
      validateFlightForm({ ...validFormData, origin: 'Xyznotacity123' })
    ).toContain('validation.invalidOrigin');
  });
});

describe('validateRoundTripDates', () => {
  it('returns true when return is after arrival', () => {
    expect(
      validateRoundTripDates('2026-06-01', '14:00', false, '2026-06-10', '10:00')
    ).toBe(true);
  });

  it('returns false when return is before arrival', () => {
    expect(
      validateRoundTripDates('2026-06-10', '14:00', false, '2026-06-01', '10:00')
    ).toBe(false);
  });
});
