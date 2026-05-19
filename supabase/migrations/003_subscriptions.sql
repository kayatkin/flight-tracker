-- Subscriptions & usage (monetization phase 1)
-- Run after 001_schema.sql and 002_rls.sql

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'trialing')),
  expires_at TIMESTAMPTZ,
  provider TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = public.jwt_user_id() AND public.is_owner());

CREATE POLICY "subscriptions_upsert_own"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.jwt_user_id() AND public.is_owner());

CREATE POLICY "subscriptions_update_own"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = public.jwt_user_id() AND public.is_owner());

GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;

-- Default free plan for existing users
INSERT INTO subscriptions (user_id, plan, status)
SELECT user_id, 'free', 'active'
FROM users
ON CONFLICT (user_id) DO NOTHING;
