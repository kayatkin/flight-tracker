// src/utils/flightAnalysis.ts
import { t } from '@shared/i18n';
import { Flight } from '../../shared/types';

export interface FlightAnalysis {
  type: 'good' | 'neutral' | 'bad';
  message: string;
  diff?: number;
}

const PRICE_THRESHOLD = 500;

export const analyzeFlightPrice = (
  newFlight: Flight,
  existingFlights: Flight[]
): FlightAnalysis => {
  const comparableFlights = existingFlights.filter((f) =>
    f.origin === newFlight.origin &&
    f.destination === newFlight.destination &&
    f.passengers === newFlight.passengers &&
    f.type === newFlight.type
  );

  if (comparableFlights.length === 0) {
    return {
      type: 'good',
      message: t('analysis.first'),
    };
  }

  const best = comparableFlights.reduce((a, b) => 
    (a.totalPrice < b.totalPrice ? a : b)
  );
  const diff = newFlight.totalPrice - best.totalPrice;

  if (diff < -PRICE_THRESHOLD) {
    return {
      type: 'good',
      message: t('analysis.cheaper', { amount: Math.abs(diff) }),
      diff,
    };
  } else if (Math.abs(diff) <= PRICE_THRESHOLD) {
    return {
      type: 'neutral',
      message: t('analysis.similar', { signed: `${diff >= 0 ? '+' : ''}${diff}` }),
      diff,
    };
  } else {
    return {
      type: 'bad',
      message: t('analysis.expensive', { amount: diff }),
      diff,
    };
  }
};