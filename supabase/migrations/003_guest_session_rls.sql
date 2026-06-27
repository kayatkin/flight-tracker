-- Bind guest JWT access to the live shared_sessions row so revokes and expiry
-- take effect immediately, not only after the guest access token expires.

CREATE OR REPLACE FUNCTION public.jwt_session_token()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'session_token';
$$;

CREATE OR REPLACE FUNCTION public.guest_session_is_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_guest()
    AND EXISTS (
      SELECT 1
      FROM public.shared_sessions s
      WHERE s.token = public.jwt_session_token()
        AND s.owner_id = public.jwt_user_id()
        AND s.is_active = TRUE
        AND s.expires_at > NOW()
    );
$$;

CREATE OR REPLACE FUNCTION public.guest_can_edit()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_guest()
    AND public.jwt_permissions() = 'edit'
    AND EXISTS (
      SELECT 1
      FROM public.shared_sessions s
      WHERE s.token = public.jwt_session_token()
        AND s.owner_id = public.jwt_user_id()
        AND s.permissions = 'edit'
        AND s.is_active = TRUE
        AND s.expires_at > NOW()
    );
$$;

DROP POLICY IF EXISTS "flights_guest_select" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_insert" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_update" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_delete" ON user_flights;

CREATE POLICY "flights_guest_select"
  ON user_flights FOR SELECT
  TO authenticated
  USING (public.guest_session_is_active() AND user_id = public.jwt_user_id());

CREATE POLICY "flights_guest_insert"
  ON user_flights FOR INSERT
  TO authenticated
  WITH CHECK (public.guest_can_edit() AND user_id = public.jwt_user_id());

CREATE POLICY "flights_guest_update"
  ON user_flights FOR UPDATE
  TO authenticated
  USING (public.guest_can_edit() AND user_id = public.jwt_user_id());

CREATE POLICY "flights_guest_delete"
  ON user_flights FOR DELETE
  TO authenticated
  USING (public.guest_can_edit() AND user_id = public.jwt_user_id());
