-- Hash share tokens at rest. New invites store token_hash only;
-- plaintext stays in the link the owner copies once.
-- Optional bind of edit invites to the first Telegram user who opens them.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE shared_sessions
  ADD COLUMN IF NOT EXISTS token_hash TEXT,
  ADD COLUMN IF NOT EXISTS bound_telegram_user_id TEXT;

ALTER TABLE shared_sessions
  ALTER COLUMN token DROP NOT NULL;

UPDATE shared_sessions
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token IS NOT NULL
  AND (token_hash IS NULL OR token_hash = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_sessions_token_hash
  ON shared_sessions (token_hash)
  WHERE token_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.lookup_share_invite(p_token text)
RETURNS TABLE (permissions text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.permissions::text, s.expires_at
  FROM public.shared_sessions s
  WHERE s.is_active IS TRUE
    AND s.expires_at > NOW()
    AND (
      s.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      OR s.token = p_token
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_share_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_share_invite(text) TO anon, authenticated;
