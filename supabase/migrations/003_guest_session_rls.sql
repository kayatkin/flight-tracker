-- Bind guest access to a live shared_sessions row so revocation/expiry takes
-- effect immediately for already-issued JWTs.

CREATE OR REPLACE FUNCTION public.jwt_share_session_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'share_session_id';
$$;

CREATE OR REPLACE FUNCTION public.guest_has_active_session(required_permission TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_guest()
    AND EXISTS (
      SELECT 1
      FROM public.shared_sessions s
      WHERE s.id::text = public.jwt_share_session_id()
        AND s.owner_id = public.jwt_user_id()
        AND s.is_active = TRUE
        AND s.expires_at > NOW()
        AND (
          required_permission = 'view'
          OR (
            required_permission = 'edit'
            AND public.jwt_permissions() = 'edit'
            AND s.permissions = 'edit'
          )
        )
    );
$$;

DROP POLICY IF EXISTS "flights_guest_select" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_insert" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_update" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_delete" ON user_flights;

CREATE POLICY "flights_guest_select"
  ON user_flights FOR SELECT
  TO authenticated
  USING (public.guest_has_active_session('view') AND user_id = public.jwt_user_id());

CREATE POLICY "flights_guest_insert"
  ON user_flights FOR INSERT
  TO authenticated
  WITH CHECK (public.guest_has_active_session('edit') AND user_id = public.jwt_user_id());

CREATE POLICY "flights_guest_update"
  ON user_flights FOR UPDATE
  TO authenticated
  USING (public.guest_has_active_session('edit') AND user_id = public.jwt_user_id());

CREATE POLICY "flights_guest_delete"
  ON user_flights FOR DELETE
  TO authenticated
  USING (public.guest_has_active_session('edit') AND user_id = public.jwt_user_id());
