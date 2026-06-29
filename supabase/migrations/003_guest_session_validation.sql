-- Re-validate guest share sessions from RLS on every access.
-- Guest JWTs include share_token and user_id = owner_id.

CREATE OR REPLACE FUNCTION public.jwt_share_token()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'share_token';
$$;

CREATE OR REPLACE FUNCTION public.guest_session_is_active(required_permission TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_guest()
    AND EXISTS (
      SELECT 1
      FROM public.shared_sessions session
      WHERE session.token = public.jwt_share_token()
        AND session.owner_id = public.jwt_user_id()
        AND session.is_active = TRUE
        AND session.expires_at > NOW()
        AND (
          required_permission IS NULL
          OR session.permissions = required_permission
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.guest_can_edit()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_guest()
    AND public.jwt_permissions() = 'edit'
    AND public.guest_session_is_active('edit');
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
