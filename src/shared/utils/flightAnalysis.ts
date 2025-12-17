// src/utils/flightAnalysis.ts
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
      message: 'Первое предложение по этому маршруту! Сохранено.',
    };
  }

  const best = comparableFlights.reduce((a, b) => 
    (a.totalPrice < b.totalPrice ? a : b)
  );
  const diff = newFlight.totalPrice - best.totalPrice;

  if (diff < -PRICE_THRESHOLD) {
    return {
      type: 'good',
      message: `Выгодно! Дешевле на ${Math.abs(diff)} ₽, чем лучший ранее.`,
      diff,
    };
  } else if (Math.abs(diff) <= PRICE_THRESHOLD) {
    return {
      type: 'neutral',
      message: `Цена почти такая же (${diff >= 0 ? '+' : ''}${diff} ₽).`,
      diff,
    };
  } else {
    return {
      type: 'bad',
      message: `Дороже на ${diff} ₽, чем лучший ранее. Не стоит.`,
      diff,
    };
  }
};