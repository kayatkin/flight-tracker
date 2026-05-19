# Monetization roadmap

Backup baseline: `v2.0.0-stable` / branch `backup/pre-monetization-2026-05-19`.

## Phase 1 — done

- [x] i18n RU/EN + language switcher
- [x] City/airline validation catalogs
- [x] SQL `subscriptions` table
- [x] `PLAN_LIMITS` + enforcement (routes, flights, charts)
- [x] `subscriptionService` + Plan badge

## Phase 2 — done (code)

- [x] Paywall UI (`UpgradeModal`) + Telegram Stars checkout
- [x] Edge function `create-pro-invoice`
- [x] Bot: `pre_checkout_query`, `successful_payment`, `/status`
- [x] SQL `payment_events` (idempotent charges)
- [x] Share link limit (free: 1 active, Pro: 5)

**Deploy:** see `docs/PAYMENTS.md`.

## Phase 3 — next

- [ ] Webhook mode for bot (optional, for production scale)
- [ ] Restore purchases / subscription management UI
- [ ] Analytics (conversion, MRR proxy via Stars)
- [ ] Localized prices / A-B test star amounts
- [x] Full i18n for HistoryView, sharing modals, add-flight form

Limits: `src/shared/constants/subscription.ts`.
