-- Read-only lookup so the Telegram bot can pre-check a share link with the anon key.
-- Does not return the token or owner id. Optional: without this RPC the bot still
-- opens the Mini App and auth-guest decides if the invite is valid.

CREATE OR REPLACE FUNCTION public.lookup_share_invite(p_token text)
RETURNS TABLE (permissions text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.permissions::text, s.expires_at
  FROM public.shared_sessions s
  WHERE s.token = p_token
    AND s.is_active IS TRUE
    AND s.expires_at > NOW()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_share_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_share_invite(text) TO anon, authenticated;
