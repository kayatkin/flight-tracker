-- Idempotent Telegram Stars payment log (service role / bot only writes)
CREATE TABLE IF NOT EXISTS payment_events (
  telegram_payment_charge_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  plan_period TEXT NOT NULL CHECK (plan_period IN ('monthly', 'annual')),
  stars_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_user ON payment_events(user_id);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- No policies: only service role (bot / edge with service key) can access
