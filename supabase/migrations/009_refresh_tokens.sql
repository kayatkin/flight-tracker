-- Opaque refresh tokens for custom Edge JWTs (Telegram, guest, auth-dev).
-- Access JWTs stay short-lived; refresh rows are hashed and rotated.

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  user_id TEXT NOT NULL,
  app_role TEXT NOT NULL CHECK (app_role IN ('owner', 'guest')),
  permissions TEXT CHECK (permissions IN ('view', 'edit')),
  share_session_id UUID REFERENCES public.shared_sessions(id) ON DELETE CASCADE,
  name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON public.refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON public.refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_share ON public.refresh_tokens(share_session_id);

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.refresh_tokens FROM PUBLIC;
REVOKE ALL ON public.refresh_tokens FROM anon;
REVOKE ALL ON public.refresh_tokens FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.refresh_tokens TO service_role;
  END IF;
END $$;
