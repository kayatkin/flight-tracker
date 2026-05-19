export type BillingPeriod = 'monthly' | 'annual';

/** Telegram Stars (XTR) — adjust after market testing. */
export const PRO_PRICING: Record<
  BillingPeriod,
  { stars: number; days: number; labelKey: string }
> = {
  monthly: { stars: 199, days: 30, labelKey: 'upgrade.monthly' },
  annual: { stars: 999, days: 365, labelKey: 'upgrade.annual' },
};

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
