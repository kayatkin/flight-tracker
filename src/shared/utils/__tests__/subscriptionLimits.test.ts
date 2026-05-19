import { describe, expect, it } from 'vitest';
import {
  canAddFlightForPlan,
  canUseCharts,
  canCreateShareLink,
  countUniqueRoutes,
  isNewRoute,
  resolveEffectivePlan,
} from '../subscriptionLimits';
import type { Flight } from '../../types';

const flight = (overrides: Partial<Flight> = {}): Flight => ({
  id: '1',
  origin: 'Moscow',
  destination: 'Istanbul',
  type: 'oneWay',
  departureDate: '2026-06-15',
  isDirectThere: true,
  isDirectBack: false,
  airline: 'TK',
  passengers: 1,
  totalPrice: 100,
  dateFound: '2026-05-01',
  ...overrides,
});

describe('subscriptionLimits', () => {
  it('counts unique origin-destination pairs', () => {
    const flights = [
      flight(),
      flight({ id: '2', totalPrice: 200 }),
      flight({ id: '3', origin: 'Moscow', destination: 'Tbilisi' }),
    ];
    expect(countUniqueRoutes(flights)).toBe(2);
  });

  it('blocks a 4th unique route on free plan', () => {
    const flights = [
      flight({ origin: 'A', destination: 'B' }),
      flight({ id: '2', origin: 'C', destination: 'D' }),
      flight({ id: '3', origin: 'E', destination: 'F' }),
    ];
    const next = flight({ id: '4', origin: 'G', destination: 'H' });
    expect(canAddFlightForPlan('free', flights, next)).toEqual({ ok: false, reason: 'destinations' });
  });

  it('allows another flight on an existing route on free plan', () => {
    const flights = [
      flight({ origin: 'A', destination: 'B' }),
      flight({ id: '2', origin: 'C', destination: 'D' }),
      flight({ id: '3', origin: 'E', destination: 'F' }),
    ];
    const next = flight({ id: '4', origin: 'A', destination: 'B', totalPrice: 50 });
    expect(canAddFlightForPlan('free', flights, next)).toEqual({ ok: true });
  });

  it('premium has unlimited routes and charts', () => {
    expect(canUseCharts('premium')).toBe(true);
    const many = Array.from({ length: 5 }, (_, i) =>
      flight({ id: String(i), origin: `O${i}`, destination: `D${i}` })
    );
    const next = flight({ id: 'new', origin: 'X', destination: 'Y' });
    expect(canAddFlightForPlan('premium', many, next)).toEqual({ ok: true });
  });

  it('expires premium when past expires_at', () => {
    expect(
      resolveEffectivePlan('premium', 'active', new Date(Date.now() - 1000).toISOString())
    ).toBe('free');
  });

  it('limits share links on free plan', () => {
    expect(canCreateShareLink('free', 0)).toBe(true);
    expect(canCreateShareLink('free', 1)).toBe(false);
    expect(canCreateShareLink('premium', 4)).toBe(true);
    expect(canCreateShareLink('premium', 5)).toBe(false);
  });

  it('detects new routes', () => {
    const flights = [flight()];
    expect(isNewRoute(flights, 'Moscow', 'Istanbul')).toBe(false);
    expect(isNewRoute(flights, 'Moscow', 'Tbilisi')).toBe(true);
  });
});
