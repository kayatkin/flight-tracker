import { PLAN_LIMITS, type PlanId } from '@shared/constants/subscription';
import type { Flight } from '@shared/types';

export type LimitBlockReason = 'destinations' | 'flights';

export function routeKey(origin: string, destination: string): string {
  return `${origin.trim().toLowerCase()}→${destination.trim().toLowerCase()}`;
}

export function countUniqueRoutes(flights: Flight[]): number {
  const keys = new Set<string>();
  for (const flight of flights) {
    if (flight.origin && flight.destination) {
      keys.add(routeKey(flight.origin, flight.destination));
    }
  }
  return keys.size;
}

export function isNewRoute(flights: Flight[], origin: string, destination: string): boolean {
  const key = routeKey(origin, destination);
  return !flights.some((f) => routeKey(f.origin, f.destination) === key);
}

export function resolveEffectivePlan(
  plan: PlanId,
  status: string,
  expiresAt: string | null
): PlanId {
  if (plan !== 'premium' || status !== 'active') {
    return 'free';
  }
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return 'free';
  }
  return 'premium';
}

export function canAddFlightForPlan(
  plan: PlanId,
  flights: Flight[],
  newFlight: Flight
): { ok: true } | { ok: false; reason: LimitBlockReason } {
  const limits = PLAN_LIMITS[plan];

  if (flights.length >= limits.maxFlights) {
    return { ok: false, reason: 'flights' };
  }

  if (
    isNewRoute(flights, newFlight.origin, newFlight.destination) &&
    countUniqueRoutes(flights) >= limits.maxDestinations
  ) {
    return { ok: false, reason: 'destinations' };
  }

  return { ok: true };
}

export function canUseCharts(plan: PlanId): boolean {
  return PLAN_LIMITS[plan].chartsEnabled;
}
