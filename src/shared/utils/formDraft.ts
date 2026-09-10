import type { FlightFormData } from '../hooks/useFlightForm';
import { createEmptyFlightForm, isFlightFormDirty } from './flightFormMapping';

export const FORM_DRAFT_STORAGE_KEY = 'flight-tracker:new-form-draft';

const asString = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asDuration = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

const asPassengers = (value: unknown): 1 | 2 | 3 | 4 => (
  value === 2 || value === 3 || value === 4 ? value : 1
);

const asType = (value: unknown): FlightFormData['type'] => (
  value === 'roundTrip' ? 'roundTrip' : 'oneWay'
);

export const parseFormDraft = (
  raw: string | null,
  today: string
): FlightFormData | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const source = parsed as Record<string, unknown>;
    const empty = createEmptyFlightForm(today);
    const draft: FlightFormData = {
      origin: asString(source.origin, empty.origin),
      destination: asString(source.destination, empty.destination),
      type: asType(source.type),
      departureDate: asString(source.departureDate, empty.departureDate),
      returnDate: asString(source.returnDate, empty.returnDate),
      departureTime: asString(source.departureTime, empty.departureTime),
      arrivalTime: asString(source.arrivalTime, empty.arrivalTime),
      returnDepartureTime: asString(source.returnDepartureTime, empty.returnDepartureTime),
      returnArrivalTime: asString(source.returnArrivalTime, empty.returnArrivalTime),
      isDirectThere: asBoolean(source.isDirectThere, empty.isDirectThere),
      isDirectBack: asBoolean(source.isDirectBack, empty.isDirectBack),
      layoverCityThere: asString(source.layoverCityThere, empty.layoverCityThere),
      layoverDurationThere: asDuration(source.layoverDurationThere, empty.layoverDurationThere),
      layoverCityBack: asString(source.layoverCityBack, empty.layoverCityBack),
      layoverDurationBack: asDuration(source.layoverDurationBack, empty.layoverDurationBack),
      airline: asString(source.airline, empty.airline),
      passengers: asPassengers(source.passengers),
      totalPrice: asString(source.totalPrice, empty.totalPrice),
      arrivalNextDay: asBoolean(source.arrivalNextDay, empty.arrivalNextDay),
      returnArrivalNextDay: asBoolean(source.returnArrivalNextDay, empty.returnArrivalNextDay),
      notes: asString(source.notes, empty.notes),
    };
    if (!isFlightFormDirty(draft, empty)) return null;
    return draft;
  } catch {
    return null;
  }
};

export const readFormDraft = (
  storage?: Pick<Storage, 'getItem'> | null,
  today?: string
): FlightFormData | null => {
  if (!storage) return null;
  try {
    return parseFormDraft(storage.getItem(FORM_DRAFT_STORAGE_KEY), today ?? '');
  } catch {
    return null;
  }
};

export const writeFormDraft = (
  data: FlightFormData,
  storage?: Pick<Storage, 'setItem'> | null
): void => {
  if (!storage) return;
  try {
    storage.setItem(FORM_DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private mode / disabled storage
  }
};

export const clearFormDraft = (
  storage?: Pick<Storage, 'removeItem'> | null
): void => {
  if (!storage) return;
  try {
    storage.removeItem(FORM_DRAFT_STORAGE_KEY);
  } catch {
    // Private mode / disabled storage
  }
};
