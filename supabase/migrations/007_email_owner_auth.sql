-- Email/password owners via Supabase Auth (GoTrue).
-- Custom Access Token hook adds app_role=owner so existing RLS matches Telegram JWTs.
-- is_owner() also treats a GoTrue session without app_role as owner (hook not enabled yet).

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.jwt_app_role() = 'owner'
    OR (
      public.jwt_app_role() IS NULL
      AND COALESCE(auth.jwt() ->> 'role', '') = 'authenticated'
    );
$$;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  uid text;
  display_name text;
BEGIN
  claims := COALESCE(event->'claims', '{}'::jsonb);
  uid := COALESCE(event->>'user_id', claims->>'sub');

  claims := jsonb_set(claims, '{app_role}', '"owner"');
  IF uid IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_id}', to_jsonb(uid));
    SELECT name INTO display_name FROM public.users WHERE user_id = uid;
    IF display_name IS NOT NULL THEN
      claims := jsonb_set(claims, '{name}', to_jsonb(display_name));
    END IF;
  END IF;

  RETURN jsonb_set(COALESCE(event, '{}'::jsonb), '{claims}', claims);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (user_id, name)
  VALUES (
    NEW.id::text,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(split_part(NEW.email, '@', 1), ''),
      'Владелец'
    )
  )
  ON CONFLICT (user_id) DO UPDATE
    SET
      name = COALESCE(EXCLUDED.name, public.users.name),
      updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.users TO supabase_auth_admin;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC;
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM anon;
  REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE PROCEDURE public.handle_new_auth_user();
  END IF;
END $$;
