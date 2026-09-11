import type { FlightFormData } from '../hooks/useFlightForm';
import type { Flight } from '../types';
import { createEmptyFlightForm, isFlightFormDirty } from './flightFormMapping';

export const FORM_DRAFT_STORAGE_KEY = 'flight-tracker:new-form-draft';
export const EDIT_FORM_DRAFT_STORAGE_KEY = 'flight-tracker:edit-form-draft';

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

interface EditFormDraftPayload {
  id: string;
  form: FlightFormData;
  flight: Flight;
}

export interface StoredEditFormDraft {
  flight: Flight;
  form: FlightFormData;
}

const parseFlightSnapshot = (raw: unknown): Flight | null => {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const id = asString(source.id, '');
  const origin = asString(source.origin, '');
  const destination = asString(source.destination, '');
  const departureDate = asString(source.departureDate, '');
  const airline = asString(source.airline, '');
  const dateFound = asString(source.dateFound, '');
  if (!id || !origin || !destination || !departureDate || !airline || !dateFound) return null;
  const totalPrice = typeof source.totalPrice === 'number' && Number.isFinite(source.totalPrice)
    ? source.totalPrice
    : Number(source.totalPrice);
  if (!Number.isFinite(totalPrice)) return null;

  const flight: Flight = {
    id,
    origin,
    destination,
    type: asType(source.type),
    departureDate,
    isDirectThere: asBoolean(source.isDirectThere, true),
    isDirectBack: asBoolean(source.isDirectBack, true),
    airline,
    passengers: asPassengers(source.passengers),
    totalPrice,
    dateFound,
  };
  const returnDate = asString(source.returnDate, '');
  if (returnDate) flight.returnDate = returnDate;
  const departureTime = asString(source.departureTime, '');
  if (departureTime) flight.departureTime = departureTime;
  const arrivalTime = asString(source.arrivalTime, '');
  if (arrivalTime) flight.arrivalTime = arrivalTime;
  const returnDepartureTime = asString(source.returnDepartureTime, '');
  if (returnDepartureTime) flight.returnDepartureTime = returnDepartureTime;
  const returnArrivalTime = asString(source.returnArrivalTime, '');
  if (returnArrivalTime) flight.returnArrivalTime = returnArrivalTime;
  const layoverCityThere = asString(source.layoverCityThere, '');
  if (layoverCityThere) flight.layoverCityThere = layoverCityThere;
  if (typeof source.layoverDurationThere === 'number') {
    flight.layoverDurationThere = source.layoverDurationThere;
  }
  const layoverCityBack = asString(source.layoverCityBack, '');
  if (layoverCityBack) flight.layoverCityBack = layoverCityBack;
  if (typeof source.layoverDurationBack === 'number') {
    flight.layoverDurationBack = source.layoverDurationBack;
  }
  const notes = asString(source.notes, '');
  if (notes) flight.notes = notes;
  if (source.arrivalNextDay === true) flight.arrivalNextDay = true;
  if (source.returnArrivalNextDay === true) flight.returnArrivalNextDay = true;
  return flight;
};

const parseStoredEditFormDraft = (
  raw: string | null,
  today: string
): StoredEditFormDraft | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const source = parsed as Record<string, unknown>;
    const flight = parseFlightSnapshot(source.flight);
    if (!flight) return null;
    if (typeof source.id === 'string' && source.id && source.id !== flight.id) return null;
    const formRaw = source.form;
    if (!formRaw || typeof formRaw !== 'object') return null;
    const form = parseFormDraft(JSON.stringify(formRaw), today);
    if (!form) return null;
    return { flight, form };
  } catch {
    return null;
  }
};

export const peekEditFormDraft = (
  storage?: Pick<Storage, 'getItem'> | null,
  today?: string
): StoredEditFormDraft | null => {
  if (!storage) return null;
  try {
    return parseStoredEditFormDraft(storage.getItem(EDIT_FORM_DRAFT_STORAGE_KEY), today ?? '');
  } catch {
    return null;
  }
};

export const readEditFormDraft = (
  flightId: string,
  storage?: Pick<Storage, 'getItem'> | null,
  today?: string
): FlightFormData | null => {
  const stored = peekEditFormDraft(storage, today);
  if (!stored || stored.flight.id !== flightId) return null;
  return stored.form;
};

export const writeEditFormDraft = (
  flight: Flight,
  data: FlightFormData,
  storage?: Pick<Storage, 'setItem'> | null
): void => {
  if (!storage || !flight.id) return;
  try {
    const payload: EditFormDraftPayload = { id: flight.id, form: data, flight };
    storage.setItem(EDIT_FORM_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private mode / disabled storage
  }
};

export const clearEditFormDraft = (
  storage?: Pick<Storage, 'removeItem'> | null
): void => {
  if (!storage) return;
  try {
    storage.removeItem(EDIT_FORM_DRAFT_STORAGE_KEY);
  } catch {
    // Private mode / disabled storage
  }
};
