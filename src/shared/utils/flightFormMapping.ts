import { Flight } from '../types';
import type { FlightFormData } from '../hooks/useFlightForm';
import { generateUUID } from './id';
import { toLocalISODate } from './date';

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
  arrivalNextDay: Boolean(flight.arrivalNextDay),
  returnArrivalNextDay: Boolean(flight.returnArrivalNextDay),
});

export const duplicateFlight = (flight: Flight): Flight => ({
  ...flight,
  id: generateUUID(),
  dateFound: toLocalISODate(),
});
