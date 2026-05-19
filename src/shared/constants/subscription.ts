/** Monetization limits — aligned with freemium plan. */
export const PLAN_LIMITS = {
  free: {
    maxDestinations: 3,
    maxFlights: 30,
    maxShareLinks: 1,
    chartsEnabled: false,
  },
  premium: {
    maxDestinations: Infinity,
    maxFlights: Infinity,
    maxShareLinks: 5,
    chartsEnabled: true,
  },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;
