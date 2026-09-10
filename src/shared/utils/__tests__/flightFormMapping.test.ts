import { describe, it, expect } from 'vitest';
import { Flight } from '../../types';
import { duplicateFlight, flightToFormData, createEmptyFlightForm, isFlightFormDirty } from '../flightFormMapping';
import { isValidUUID } from '../id';
import { toLocalISODate } from '../date';

const makeFlight = (overrides: Partial<Flight> = {}): Flight => ({
  id: '11111111-1111-4111-8111-111111111111',
  origin: 'Москва',
  destination: 'Тбилиси',
  type: 'roundTrip',
  departureDate: '2026-06-15',
  returnDate: '2026-06-22',
  departureTime: '10:00',
  arrivalTime: '14:00',
  returnDepartureTime: '16:00',
  returnArrivalTime: '20:00',
  isDirectThere: false,
  isDirectBack: true,
  layoverCityThere: 'Сочи',
  layoverDurationThere: 90,
  airline: 'Аэрофлот',
  passengers: 2,
  totalPrice: 42000,
  dateFound: '2026-01-02',
  arrivalNextDay: true,
  returnArrivalNextDay: false,
  ...overrides,
});

describe('flightToFormData', () => {
  it('maps a saved flight onto the form fields', () => {
    const form = flightToFormData(makeFlight());
    expect(form.origin).toBe('Москва');
    expect(form.destination).toBe('Тбилиси');
    expect(form.type).toBe('roundTrip');
    expect(form.returnDate).toBe('2026-06-22');
    expect(form.layoverCityThere).toBe('Сочи');
    expect(form.layoverDurationThere).toBe(90);
    expect(form.totalPrice).toBe('42000');
    expect(form.arrivalNextDay).toBe(true);
    expect(form.passengers).toBe(2);
  });

  it('fills defaults for missing optional fields', () => {
    const form = flightToFormData(makeFlight({
      type: 'oneWay',
      returnDate: undefined,
      layoverCityThere: undefined,
      layoverDurationThere: undefined,
      totalPrice: 0,
    }));
    expect(form.returnDate).toBe('');
    expect(form.layoverCityThere).toBe('');
    expect(form.layoverDurationThere).toBe(60);
    expect(form.totalPrice).toBe('');
  });
});

describe('duplicateFlight', () => {
  it('keeps payload but assigns a new UUID and today as dateFound', () => {
    const original = makeFlight();
    const cloned = duplicateFlight(original);

    expect(cloned.id).not.toBe(original.id);
    expect(isValidUUID(cloned.id)).toBe(true);
    expect(cloned.origin).toBe(original.origin);
    expect(cloned.destination).toBe(original.destination);
    expect(cloned.totalPrice).toBe(original.totalPrice);
    expect(cloned.dateFound).toBe(toLocalISODate());
  });
});

describe('isFlightFormDirty', () => {
  it('is clean when the form still matches the baseline', () => {
    const form = createEmptyFlightForm('2026-09-10');
    expect(isFlightFormDirty(form, form)).toBe(false);
  });

  it('turns dirty after a field changes', () => {
    const baseline = createEmptyFlightForm('2026-09-10');
    expect(isFlightFormDirty({ ...baseline, origin: 'Москва' }, baseline)).toBe(true);
  });
});
