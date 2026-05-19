import {
  isKnownAirline,
  isKnownCity,
  isValidAirlineFormat,
  isValidCityFormat,
} from './fieldValidation';

export type ValidationErrorKey =
  | 'validation.originDestinationRequired'
  | 'validation.sameOriginDestination'
  | 'validation.invalidOrigin'
  | 'validation.invalidDestination'
  | 'validation.invalidAirline'
  | 'validation.departureDateRequired'
  | 'validation.returnDateRequired'
  | 'validation.invalidPrice';

export interface FlightFormValidationInput {
  origin: string;
  destination: string;
  type: 'oneWay' | 'roundTrip';
  departureDate: string;
  returnDate: string;
  totalPrice: string;
  airline?: string;
}

export interface ValidateFlightFormOptions {
  originHistory?: string[];
  destinationHistory?: string[];
  airlineHistory?: string[];
}

export const validateFlightForm = (
  formData: FlightFormValidationInput,
  options: ValidateFlightFormOptions = {}
): ValidationErrorKey[] => {
  const errors: ValidationErrorKey[] = [];
  const { originHistory = [], destinationHistory = [], airlineHistory = [] } = options;

  if (!formData.origin?.trim() || !formData.destination?.trim()) {
    errors.push('validation.originDestinationRequired');
  } else {
    if (normalizePair(formData.origin) === normalizePair(formData.destination)) {
      errors.push('validation.sameOriginDestination');
    }
    if (!isValidCityFormat(formData.origin) || !isKnownCity(formData.origin, originHistory)) {
      errors.push('validation.invalidOrigin');
    }
    if (
      !isValidCityFormat(formData.destination) ||
      !isKnownCity(formData.destination, destinationHistory)
    ) {
      errors.push('validation.invalidDestination');
    }
  }

  if (!formData.departureDate) {
    errors.push('validation.departureDateRequired');
  }

  if (formData.type === 'roundTrip' && !formData.returnDate) {
    errors.push('validation.returnDateRequired');
  }

  const priceNum = Number(formData.totalPrice);
  if (!formData.totalPrice || Number.isNaN(priceNum) || priceNum <= 0) {
    errors.push('validation.invalidPrice');
  }

  if (formData.airline !== undefined) {
    const airline = formData.airline.trim();
    if (
      airline &&
      (!isValidAirlineFormat(airline) || !isKnownAirline(airline, airlineHistory))
    ) {
      errors.push('validation.invalidAirline');
    }
  }

  return errors;
};

const normalizePair = (city: string): string => city.trim().toLowerCase();

export const validateRoundTripDates = (
  departureDate: string,
  arrivalTime: string,
  arrivalNextDay: boolean,
  returnDate: string,
  returnDepartureTime: string
): boolean => {
  try {
    const arrivalDateTime = new Date(`${departureDate}T${arrivalTime || '00:00'}`);

    if (arrivalNextDay) {
      arrivalDateTime.setDate(arrivalDateTime.getDate() + 1);
    }

    const returnDepartureDateTime = new Date(`${returnDate}T${returnDepartureTime || '00:00'}`);

    return returnDepartureDateTime > arrivalDateTime;
  } catch {
    return false;
  }
};
