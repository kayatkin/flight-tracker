-- Link Telegram Mini App owners and email/password owners to one canonical user_id.

CREATE TABLE IF NOT EXISTS public.user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('telegram', 'email')),
  provider_user_id TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON public.user_identities(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_user_id_provider_key
  ON public.user_identities (user_id, provider);

ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "identities_select_own" ON public.user_identities;
CREATE POLICY "identities_select_own"
  ON public.user_identities FOR SELECT
  TO authenticated
  USING (public.is_owner() AND user_id = public.jwt_user_id());

REVOKE ALL ON public.user_identities FROM PUBLIC;
REVOKE ALL ON public.user_identities FROM anon;
REVOKE ALL ON public.user_identities FROM authenticated;
GRANT SELECT ON public.user_identities TO authenticated;

INSERT INTO public.user_identities (user_id, provider, provider_user_id)
SELECT user_id, 'telegram', user_id
FROM public.users
WHERE user_id LIKE 'tg\_%' ESCAPE '\'
ON CONFLICT (provider, provider_user_id) DO NOTHING;

INSERT INTO public.user_identities (user_id, provider, provider_user_id)
SELECT user_id, 'email', user_id
FROM public.users
WHERE user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ON CONFLICT (provider, provider_user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.canonical_email_user_id(auth_uid text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT user_id
      FROM public.user_identities
      WHERE provider = 'email' AND provider_user_id = auth_uid
      LIMIT 1
    ),
    auth_uid
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
  canonical text;
  display_name text;
BEGIN
  claims := COALESCE(event->'claims', '{}'::jsonb);
  uid := COALESCE(event->>'user_id', claims->>'sub');
  canonical := public.canonical_email_user_id(uid);

  claims := jsonb_set(claims, '{app_role}', '"owner"');
  IF canonical IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_id}', to_jsonb(canonical));
    SELECT name INTO display_name FROM public.users WHERE user_id = canonical;
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

  INSERT INTO public.user_identities (user_id, provider, provider_user_id, email)
  VALUES (
    NEW.id::text,
    'email',
    NEW.id::text,
    NULLIF(lower(NEW.email), '')
  )
  ON CONFLICT (provider, provider_user_id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.user_identities.email);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reassign_owner(from_id text, to_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF from_id IS NULL OR to_id IS NULL OR from_id = to_id THEN
    RETURN;
  END IF;

  UPDATE public.user_flights
    SET user_id = to_id, updated_at = NOW()
    WHERE user_id = from_id;

  UPDATE public.shared_sessions
    SET owner_id = to_id
    WHERE owner_id = from_id;

  DELETE FROM public.user_identities AS src
  WHERE src.user_id = from_id
    AND EXISTS (
      SELECT 1
      FROM public.user_identities AS dst
      WHERE dst.user_id = to_id AND dst.provider = src.provider
    );

  UPDATE public.user_identities
    SET user_id = to_id
    WHERE user_id = from_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reassign_owner(text, text) FROM PUBLIC;
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.reassign_owner(text, text) FROM anon;
  REVOKE ALL ON FUNCTION public.reassign_owner(text, text) FROM authenticated;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.reassign_owner(text, text) TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_identities TO service_role;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT SELECT ON TABLE public.user_identities TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.canonical_email_user_id(text) TO supabase_auth_admin;
    GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
  END IF;
END $$;
