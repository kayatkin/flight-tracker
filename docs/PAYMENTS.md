# Telegram Stars payments (Pro)

## Setup checklist

1. **SQL** — run in Supabase SQL Editor (after `003_subscriptions.sql`):
   - `supabase/migrations/004_payment_events.sql`

2. **Edge function**
   ```bash
   supabase functions deploy create-pro-invoice --no-verify-jwt
   ```
   Secrets: `BOT_TOKEN`, `JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.

3. **Bot** — restart `bot/index.js` (polling). Handlers:
   - `pre_checkout_query` — approve invoice
   - `successful_payment` — activate Pro in `subscriptions`
   - `/status` — show plan and expiry

4. **BotFather** — enable payments for the bot if required for Stars in your region.

## Pricing (code)

| Plan    | Stars | Duration |
|---------|-------|----------|
| Monthly | 199   | 30 days  |
| Annual  | 999   | 365 days |

Defined in `src/shared/constants/subscription.ts` (`PRO_PRICING`) and mirrored in `create-pro-invoice` edge function.

## Flow

1. User opens **Upgrade** in the mini app (Plan badge or paywall).
2. App calls `create-pro-invoice` with Telegram `initData` + period.
3. `WebApp.openInvoice(url)` opens Telegram payment UI.
4. Bot receives `successful_payment`, writes `payment_events` + upserts `subscriptions`.
5. App calls `refreshPlan()` after `status === 'paid'`.

## Testing

- Works only inside **Telegram mini app** (not plain browser / dev without initData).
- After payment: `/status` in bot or reload mini app.
- Manual Pro (SQL): see `docs/MONETIZATION_ROADMAP.md`.

## Dev users

`dev_user_*` IDs are not Telegram users; Stars checkout requires real `tg_<id>` from mini app auth.
