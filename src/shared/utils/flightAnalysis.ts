import { Flight } from '../../shared/types';

export interface FlightAnalysis {
  type: 'good' | 'neutral' | 'bad';
  messageKey: string;
  messageParams?: Record<string, string | number>;
  diff?: number;
}

const PRICE_THRESHOLD = 500;

export const analyzeFlightPrice = (
  newFlight: Flight,
  existingFlights: Flight[]
): FlightAnalysis => {
  const comparableFlights = existingFlights.filter(
    (f) =>
      f.origin === newFlight.origin &&
      f.destination === newFlight.destination &&
      f.passengers === newFlight.passengers &&
      f.type === newFlight.type
  );

  if (comparableFlights.length === 0) {
    return {
      type: 'good',
      messageKey: 'priceAnalysis.firstRoute',
    };
  }

  const best = comparableFlights.reduce((a, b) => (a.totalPrice < b.totalPrice ? a : b));
  const diff = newFlight.totalPrice - best.totalPrice;
  const absDiff = Math.abs(diff);

  if (diff < -PRICE_THRESHOLD) {
    return {
      type: 'good',
      messageKey: 'priceAnalysis.good',
      messageParams: { amount: absDiff },
      diff,
    };
  }

  if (Math.abs(diff) <= PRICE_THRESHOLD) {
    return {
      type: 'neutral',
      messageKey: 'priceAnalysis.neutral',
      messageParams: { diff },
      diff,
    };
  }

  return {
    type: 'bad',
    messageKey: 'priceAnalysis.bad',
    messageParams: { amount: diff },
    diff,
  };
};
