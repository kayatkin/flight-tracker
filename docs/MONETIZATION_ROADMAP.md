# Monetization roadmap

Backup baseline: `v2.0.0-stable` / branch `backup/pre-monetization-2026-05-19`.

## Phase 1 (current branch)

- [x] i18n RU/EN + language switcher
- [x] City/airline validation catalogs
- [x] SQL `subscriptions` table
- [x] `PLAN_LIMITS` constants in code
- [ ] Wire subscription from Supabase in `subscriptionService`
- [ ] Enforce 3 destination limit on add flight
- [ ] Gate charts for premium
- [ ] Paywall UI + Telegram Stars

## Phase 2

- Payments webhook, `/status` in bot
- Annual plan pricing
- Analytics (conversion, churn)

See product limits in `src/shared/constants/subscription.ts`.
