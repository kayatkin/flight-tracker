-- Ensure guest JWTs remain tied to active share sessions and updates cannot
-- move protected rows across owners after passing the old-row RLS check.

CREATE OR REPLACE FUNCTION public.jwt_session_token()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'session_token';
$$;

CREATE OR REPLACE FUNCTION public.guest_session_valid()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_guest()
    AND public.jwt_session_token() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.shared_sessions session
      WHERE session.token = public.jwt_session_token()
        AND session.owner_id = public.jwt_user_id()
        AND session.is_active = TRUE
        AND session.expires_at > NOW()
    );
$$;

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (public.is_owner() AND user_id = public.jwt_user_id())
  WITH CHECK (public.is_owner() AND user_id = public.jwt_user_id());

DROP POLICY IF EXISTS "flights_owner_update" ON user_flights;
CREATE POLICY "flights_owner_update"
  ON user_flights FOR UPDATE
  TO authenticated
  USING (public.is_owner() AND user_id = public.jwt_user_id())
  WITH CHECK (public.is_owner() AND user_id = public.jwt_user_id());

DROP POLICY IF EXISTS "flights_guest_select" ON user_flights;
CREATE POLICY "flights_guest_select"
  ON user_flights FOR SELECT
  TO authenticated
  USING (public.guest_session_valid() AND user_id = public.jwt_user_id());

DROP POLICY IF EXISTS "flights_guest_insert" ON user_flights;
CREATE POLICY "flights_guest_insert"
  ON user_flights FOR INSERT
  TO authenticated
  WITH CHECK (
    public.guest_session_valid()
    AND public.guest_can_edit()
    AND user_id = public.jwt_user_id()
  );

DROP POLICY IF EXISTS "flights_guest_update" ON user_flights;
CREATE POLICY "flights_guest_update"
  ON user_flights FOR UPDATE
  TO authenticated
  USING (
    public.guest_session_valid()
    AND public.guest_can_edit()
    AND user_id = public.jwt_user_id()
  )
  WITH CHECK (
    public.guest_session_valid()
    AND public.guest_can_edit()
    AND user_id = public.jwt_user_id()
  );

DROP POLICY IF EXISTS "flights_guest_delete" ON user_flights;
CREATE POLICY "flights_guest_delete"
  ON user_flights FOR DELETE
  TO authenticated
  USING (
    public.guest_session_valid()
    AND public.guest_can_edit()
    AND user_id = public.jwt_user_id()
  );

DROP POLICY IF EXISTS "sessions_owner_update" ON shared_sessions;
CREATE POLICY "sessions_owner_update"
  ON shared_sessions FOR UPDATE
  TO authenticated
  USING (public.is_owner() AND owner_id = public.jwt_user_id())
  WITH CHECK (public.is_owner() AND owner_id = public.jwt_user_id());
