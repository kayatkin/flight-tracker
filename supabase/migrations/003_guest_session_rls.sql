-- Guest JWTs now carry share_session_id. Existing tokens without the claim stay valid
-- until they expire; new tokens are rechecked against shared_sessions on every query.

CREATE OR REPLACE FUNCTION public.jwt_share_session_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'share_session_id', '');
$$;

CREATE OR REPLACE FUNCTION public.guest_session_is_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.jwt_share_session_id() IS NULL THEN TRUE
    ELSE EXISTS (
      SELECT 1
      FROM public.shared_sessions s
      WHERE s.id::text = public.jwt_share_session_id()
        AND s.is_active IS TRUE
        AND s.expires_at > NOW()
        AND s.owner_id = public.jwt_user_id()
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.guest_session_is_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_session_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jwt_share_session_id() TO authenticated;

DROP POLICY IF EXISTS "flights_guest_select" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_insert" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_update" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_delete" ON user_flights;

CREATE POLICY "flights_guest_select"
  ON user_flights FOR SELECT
  TO authenticated
  USING (public.is_guest() AND user_id = public.jwt_user_id() AND public.guest_session_is_active());

CREATE POLICY "flights_guest_insert"
  ON user_flights FOR INSERT
  TO authenticated
  WITH CHECK (public.guest_can_edit() AND user_id = public.jwt_user_id() AND public.guest_session_is_active());

CREATE POLICY "flights_guest_update"
  ON user_flights FOR UPDATE
  TO authenticated
  USING (public.guest_can_edit() AND user_id = public.jwt_user_id() AND public.guest_session_is_active());

CREATE POLICY "flights_guest_delete"
  ON user_flights FOR DELETE
  TO authenticated
  USING (public.guest_can_edit() AND user_id = public.jwt_user_id() AND public.guest_session_is_active());
