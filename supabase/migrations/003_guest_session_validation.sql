-- Keep guest access tied to the live shared_sessions row.

CREATE OR REPLACE FUNCTION public.jwt_share_token()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'share_token';
$$;

CREATE OR REPLACE FUNCTION public.guest_share_session_valid(required_permission TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shared_sessions AS ss
    WHERE ss.token = public.jwt_share_token()
      AND ss.owner_id = public.jwt_user_id()
      AND ss.is_active = TRUE
      AND ss.expires_at > NOW()
      AND (required_permission IS NULL OR ss.permissions = required_permission)
  );
$$;

CREATE OR REPLACE FUNCTION public.guest_can_edit()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.is_guest()
    AND public.jwt_permissions() = 'edit'
    AND public.guest_share_session_valid('edit');
$$;

DROP POLICY IF EXISTS "flights_guest_select" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_insert" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_update" ON user_flights;
DROP POLICY IF EXISTS "flights_guest_delete" ON user_flights;

CREATE POLICY "flights_guest_select"
  ON user_flights FOR SELECT
  TO authenticated
  USING (
    public.is_guest()
    AND user_id = public.jwt_user_id()
    AND public.guest_share_session_valid()
  );

CREATE POLICY "flights_guest_insert"
  ON user_flights FOR INSERT
  TO authenticated
  WITH CHECK (
    public.guest_can_edit()
    AND user_id = public.jwt_user_id()
  );

CREATE POLICY "flights_guest_update"
  ON user_flights FOR UPDATE
  TO authenticated
  USING (
    public.guest_can_edit()
    AND user_id = public.jwt_user_id()
  )
  WITH CHECK (
    public.guest_can_edit()
    AND user_id = public.jwt_user_id()
  );

CREATE POLICY "flights_guest_delete"
  ON user_flights FOR DELETE
  TO authenticated
  USING (
    public.guest_can_edit()
    AND user_id = public.jwt_user_id()
  );
