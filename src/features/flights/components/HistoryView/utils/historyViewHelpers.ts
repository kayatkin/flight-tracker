import { Flight } from '@shared/types';
import i18n from '@shared/lib/i18n/config';

export const formatDateToDMY = (isoDate: string): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
};

export const formatPrice = (price: number): string => {
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US';
  return `${new Intl.NumberFormat(locale).format(price)} ₽`;
};

export const formatLayover = (flight: Flight): string => {
  const parts: string[] = [];

  if (flight.isDirectThere) {
    parts.push(i18n.t('history.layoverDirectThere'));
  } else if (flight.layoverCityThere && flight.layoverDurationThere) {
    const h = Math.floor(flight.layoverDurationThere / 60);
    const m = flight.layoverDurationThere % 60;
    parts.push(i18n.t('history.layoverThere', { city: flight.layoverCityThere, h, m }));
  }

  if (flight.type === 'roundTrip') {
    if (flight.isDirectBack) {
      parts.push(i18n.t('history.layoverDirectBack'));
    } else if (flight.layoverCityBack && flight.layoverDurationBack) {
      const h = Math.floor(flight.layoverDurationBack / 60);
      const m = flight.layoverDurationBack % 60;
      parts.push(i18n.t('history.layoverBack', { city: flight.layoverCityBack, h, m }));
    }
  }

  return parts.join(' • ');
};

export const getBestFlight = (flightList: Flight[]): Flight => {
  return flightList.reduce((best, curr) => {
    const bestPrice = best.totalPrice / best.passengers;
    const currPrice = curr.totalPrice / curr.passengers;
    return currPrice < bestPrice ? curr : best;
  });
};

export const groupFlightsByDestination = (flights: Flight[]): Record<string, Flight[]> => {
  const groups: Record<string, Flight[]> = {};
  flights.forEach((flight) => {
    const key = flight.destination;
    if (!groups[key]) groups[key] = [];
    groups[key].push(flight);
  });
  return groups;
};
