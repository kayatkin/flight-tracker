import { Flight } from '../types';
import type { FlightFormData } from '../hooks/useFlightForm';
import { generateUUID } from './id';
import { toLocalISODate } from './date';

export const createEmptyFlightForm = (today: string): FlightFormData => ({
  origin: '',
  destination: '',
  type: 'oneWay',
  departureDate: today,
  returnDate: '',
  departureTime: '',
  arrivalTime: '',
  returnDepartureTime: '',
  returnArrivalTime: '',
  isDirectThere: true,
  isDirectBack: true,
  layoverCityThere: '',
  layoverDurationThere: 60,
  layoverCityBack: '',
  layoverDurationBack: 60,
  airline: '',
  passengers: 1,
  totalPrice: '',
  notes: '',
  arrivalNextDay: false,
  returnArrivalNextDay: false,
});

export const isFlightFormDirty = (
  current: FlightFormData,
  baseline: FlightFormData
): boolean =>
  (Object.keys(current) as (keyof FlightFormData)[]).some(
    (key) => current[key] !== baseline[key]
  );

export const DISCARD_UNSAVED_MESSAGE =
  'Есть несохранённые изменения. Уйти без сохранения?';

export const confirmDiscardUnsaved = (): boolean =>
  window.confirm(DISCARD_UNSAVED_MESSAGE);

export const flightToFormData = (flight: Flight): FlightFormData => ({
  origin: flight.origin ?? '',
  destination: flight.destination ?? '',
  type: flight.type,
  departureDate: flight.departureDate ?? '',
  returnDate: flight.returnDate ?? '',
  departureTime: flight.departureTime ?? '',
  arrivalTime: flight.arrivalTime ?? '',
  returnDepartureTime: flight.returnDepartureTime ?? '',
  returnArrivalTime: flight.returnArrivalTime ?? '',
  isDirectThere: flight.isDirectThere,
  isDirectBack: flight.isDirectBack,
  layoverCityThere: flight.layoverCityThere ?? '',
  layoverDurationThere: flight.layoverDurationThere ?? 60,
  layoverCityBack: flight.layoverCityBack ?? '',
  layoverDurationBack: flight.layoverDurationBack ?? 60,
  airline: flight.airline ?? '',
  passengers: flight.passengers,
  totalPrice: flight.totalPrice ? String(flight.totalPrice) : '',
  notes: flight.notes ?? '',
  arrivalNextDay: Boolean(flight.arrivalNextDay),
  returnArrivalNextDay: Boolean(flight.returnArrivalNextDay),
});

export const duplicateFlight = (flight: Flight): Flight => ({
  ...flight,
  id: generateUUID(),
  dateFound: toLocalISODate(),
});
