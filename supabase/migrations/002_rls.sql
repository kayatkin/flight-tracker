-- JWT-based Row Level Security for Flight Tracker
-- Requires auth via Edge Functions: auth-telegram | auth-guest | auth-dev

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_sessions ENABLE ROW LEVEL SECURITY;

-- Drop legacy insecure policies (if present)
DROP POLICY IF EXISTS "shared_sessions_read_active" ON shared_sessions;
DROP POLICY IF EXISTS "user_flights_select_own" ON user_flights;
DROP POLICY IF EXISTS "user_flights_insert_own" ON user_flights;
DROP POLICY IF EXISTS "user_flights_update_own" ON user_flights;
DROP POLICY IF EXISTS "user_flights_delete_own" ON user_flights;
DROP POLICY IF EXISTS "shared_sessions_insert_owner" ON shared_sessions;
DROP POLICY IF EXISTS "shared_sessions_update_owner" ON shared_sessions;

-- Helpers
CREATE OR REPLACE FUNCTION public.jwt_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'user_id', auth.jwt() ->> 'sub');
$$;

CREATE OR REPLACE FUNCTION public.jwt_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'app_role';
$$;

CREATE OR REPLACE FUNCTION public.jwt_permissions()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'permissions';
$$;

CREATE OR REPLACE FUNCTION public.jwt_share_token()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() ->> 'share_token';
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_app_role() = 'owner';
$$;

CREATE OR REPLACE FUNCTION public.is_guest()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.jwt_app_role() = 'guest';
$$;

CREATE OR REPLACE FUNCTION public.guest_session_valid(required_permission TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shared_sessions
    WHERE token = public.jwt_share_token()
      AND owner_id = public.jwt_user_id()
      AND is_active = TRUE
      AND expires_at > NOW()
      AND (
        required_permission IS NULL
        OR permissions = required_permission
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.guest_can_edit()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.is_guest()
    AND public.jwt_permissions() = 'edit'
    AND public.guest_session_valid('edit');
$$;

-- USERS
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (user_id = public.jwt_user_id());

CREATE POLICY "users_upsert_own"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner() AND user_id = public.jwt_user_id());

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (public.is_owner() AND user_id = public.jwt_user_id());

-- USER FLIGHTS — owner
CREATE POLICY "flights_owner_select"
  ON user_flights FOR SELECT
  TO authenticated
  USING (public.is_owner() AND user_id = public.jwt_user_id());

CREATE POLICY "flights_owner_insert"
  ON user_flights FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner() AND user_id = public.jwt_user_id());

CREATE POLICY "flights_owner_update"
  ON user_flights FOR UPDATE
  TO authenticated
  USING (public.is_owner() AND user_id = public.jwt_user_id());

CREATE POLICY "flights_owner_delete"
  ON user_flights FOR DELETE
  TO authenticated
  USING (public.is_owner() AND user_id = public.jwt_user_id());

-- USER FLIGHTS — guest (JWT user_id = owner_id)
CREATE POLICY "flights_guest_select"
  ON user_flights FOR SELECT
  TO authenticated
  USING (public.is_guest() AND user_id = public.jwt_user_id() AND public.guest_session_valid());

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

-- SHARED SESSIONS — owner only
CREATE POLICY "sessions_owner_select"
  ON shared_sessions FOR SELECT
  TO authenticated
  USING (public.is_owner() AND owner_id = public.jwt_user_id());

CREATE POLICY "sessions_owner_insert"
  ON shared_sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner() AND owner_id = public.jwt_user_id());

CREATE POLICY "sessions_owner_update"
  ON shared_sessions FOR UPDATE
  TO authenticated
  USING (public.is_owner() AND owner_id = public.jwt_user_id());

CREATE POLICY "sessions_owner_delete"
  ON shared_sessions FOR DELETE
  TO authenticated
  USING (public.is_owner() AND owner_id = public.jwt_user_id());

-- Revoke anon access to data tables (Edge Functions use service role for token validation)
REVOKE ALL ON users FROM anon;
REVOKE ALL ON user_flights FROM anon;
REVOKE ALL ON shared_sessions FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_flights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shared_sessions TO authenticated;
