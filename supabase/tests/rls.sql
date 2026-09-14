-- Policy checks against the same JWT claims the Mini App sends.

CREATE SCHEMA IF NOT EXISTS tests;

CREATE OR REPLACE FUNCTION tests.expect(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT condition THEN
    RAISE EXCEPTION 'RLS test failed: %', message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION tests.as_jwt(claims jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', claims::text, false);
END;
$$;

GRANT USAGE ON SCHEMA tests TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated;

INSERT INTO users (user_id, name) VALUES
  ('owner_a', 'Alice'),
  ('owner_b', 'Bob');

INSERT INTO user_flights (
  flight_id, user_id, origin, destination, flight_type,
  departure_date, airline, passengers, total_price, date_found, notes
) VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'owner_a', 'Москва', 'Тбилиси', 'oneWay',
    '2026-06-15', 'SU', 1, 10000, '2026-05-01', 'окно'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'owner_b', 'Питер', 'Анталья', 'oneWay',
    '2026-07-01', 'S7', 1, 20000, '2026-05-02', NULL
  );

INSERT INTO shared_sessions (id, token, owner_id, permissions, is_active, expires_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'view_token_active', 'owner_a', 'view', TRUE, NOW() + INTERVAL '1 day'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'edit_token_active', 'owner_a', 'edit', TRUE, NOW() + INTERVAL '1 day'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'view_token_revoked', 'owner_a', 'view', FALSE, NOW() + INTERVAL '1 day'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'view_token_expired', 'owner_a', 'view', TRUE, NOW() - INTERVAL '1 day');

INSERT INTO shared_sessions (id, token, token_hash, owner_id, permissions, is_active, expires_at) VALUES
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    NULL,
    encode(digest('hashed_only_token', 'sha256'), 'hex'),
    'owner_a', 'view', TRUE, NOW() + INTERVAL '1 day'
  );

-- Owner A sees only own flights, including notes.
SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"owner"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  (SELECT count(*) FROM user_flights) = 1,
  'owner A should see exactly one flight'
);
SELECT tests.expect(
  (SELECT notes FROM user_flights WHERE user_id = 'owner_a') = 'окно',
  'owner A should read own notes'
);
RESET ROLE;

-- Owner A cannot read owner B.
SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"owner"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  NOT EXISTS (SELECT 1 FROM user_flights WHERE user_id = 'owner_b'),
  'owner A must not see owner B flights'
);
RESET ROLE;

-- View guest can read owner A, cannot insert.
SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"guest","permissions":"view","share_session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  (SELECT count(*) FROM user_flights) = 1,
  'view guest should read owner flights'
);

DO $$
BEGIN
  INSERT INTO user_flights (
    flight_id, user_id, origin, destination, flight_type,
    departure_date, airline, passengers, total_price, date_found
  ) VALUES (
    '33333333-3333-4333-8333-333333333333',
    'owner_a', 'Казань', 'Сочи', 'oneWay',
    '2026-08-01', 'U6', 1, 9000, '2026-05-03'
  );
  RAISE EXCEPTION 'RLS test failed: view guest inserted a flight';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;

-- Edit guest can insert.
SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"guest","permissions":"edit","share_session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}'::jsonb);
SET ROLE authenticated;
INSERT INTO user_flights (
  flight_id, user_id, origin, destination, flight_type,
  departure_date, airline, passengers, total_price, date_found, notes
) VALUES (
  '44444444-4444-4444-8444-444444444444',
  'owner_a', 'Казань', 'Сочи', 'oneWay',
  '2026-08-01', 'U6', 1, 9000, '2026-05-03', 'добавлено гостем'
);
SELECT tests.expect(
  (SELECT count(*) FROM user_flights WHERE user_id = 'owner_a') = 2,
  'edit guest should insert into owner history'
);
RESET ROLE;

-- Revoked guest sees nothing.
SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"guest","permissions":"view","share_session_id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  (SELECT count(*) FROM user_flights) = 0,
  'revoked guest must not see flights'
);
RESET ROLE;

-- Expired guest sees nothing.
SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"guest","permissions":"view","share_session_id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  (SELECT count(*) FROM user_flights) = 0,
  'expired guest must not see flights'
);
RESET ROLE;

-- Legacy guest JWT without share_session_id still works.
SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"guest","permissions":"view"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  (SELECT count(*) FROM user_flights) >= 1,
  'legacy guest JWT without share_session_id should still read'
);
RESET ROLE;

-- Email/GoTrue owner JWT without app_role still owns its own rows.
-- Real GoTrue tokens use `sub`; user_id is added only after the access-token hook.
INSERT INTO users (user_id, name) VALUES
  ('email_owner', 'Email'),
  ('11111111-1111-4111-8111-aaaaaaaaaaaa', 'GoTrue');
SELECT tests.as_jwt('{"role":"authenticated","sub":"11111111-1111-4111-8111-aaaaaaaaaaaa"}'::jsonb);
SET ROLE authenticated;
INSERT INTO user_flights (
  flight_id, user_id, origin, destination, flight_type,
  departure_date, airline, passengers, total_price, date_found
) VALUES (
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-aaaaaaaaaaaa', 'Уфа', 'Сочи', 'oneWay',
  '2026-09-01', 'SU', 1, 7000, '2026-08-01'
);
SELECT tests.expect(
  (SELECT count(*) FROM user_flights WHERE user_id = '11111111-1111-4111-8111-aaaaaaaaaaaa') = 1,
  'GoTrue owner JWT with only sub should insert own flights'
);
RESET ROLE;

SELECT tests.as_jwt('{"role":"authenticated","sub":"email_owner","user_id":"email_owner"}'::jsonb);
SET ROLE authenticated;
INSERT INTO user_flights (
  flight_id, user_id, origin, destination, flight_type,
  departure_date, airline, passengers, total_price, date_found
) VALUES (
  '55555555-5555-4555-8555-555555555555',
  'email_owner', 'Казань', 'Сочи', 'oneWay',
  '2026-09-01', 'SU', 1, 8000, '2026-08-01'
);
SELECT tests.expect(
  (SELECT count(*) FROM user_flights WHERE user_id = 'email_owner') = 1,
  'email owner without app_role should insert own flights'
);
RESET ROLE;

-- Guest JWT must not become owner just because role=authenticated.
SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"guest","permissions":"view","share_session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  NOT EXISTS (SELECT 1 FROM user_flights WHERE user_id = 'email_owner'),
  'guest must not see email-owner flights'
);
RESET ROLE;

-- Identities: owner can read own rows, guest cannot, clients cannot insert.
INSERT INTO users (user_id, name) VALUES
  ('tg_ident', 'Ident');
INSERT INTO user_identities (user_id, provider, provider_user_id, email) VALUES
  ('tg_ident', 'telegram', 'tg_ident', NULL),
  ('tg_ident', 'email', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'kai@example.com');

SELECT tests.expect(
  public.canonical_email_user_id('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') = 'tg_ident',
  'canonical helper should map GoTrue uuid to linked telegram user'
);
SELECT tests.expect(
  public.canonical_email_user_id('missing-user') = 'missing-user',
  'canonical helper should fall back to the auth uid'
);

SELECT tests.as_jwt('{"role":"authenticated","user_id":"tg_ident","app_role":"owner"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  (SELECT count(*) FROM user_identities) = 2,
  'owner should read own identities'
);
DO $$
BEGIN
  INSERT INTO user_identities (user_id, provider, provider_user_id)
  VALUES ('tg_ident', 'telegram', 'tg_forged');
  RAISE EXCEPTION 'RLS test failed: authenticated inserted user_identities';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
  WHEN check_violation THEN
    RAISE EXCEPTION 'RLS test failed: identity insert reached CHECK instead of grant/RLS';
END $$;
RESET ROLE;

SELECT tests.as_jwt('{"role":"authenticated","user_id":"tg_ident","app_role":"guest","permissions":"view","share_session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  (SELECT count(*) FROM user_identities) = 0,
  'guest must not read identities'
);
RESET ROLE;

SELECT tests.as_jwt('{"role":"authenticated","user_id":"owner_a","app_role":"owner"}'::jsonb);
SET ROLE authenticated;
SELECT tests.expect(
  NOT EXISTS (SELECT 1 FROM user_identities WHERE user_id = 'tg_ident'),
  'owner A must not read another owner identities'
);
RESET ROLE;

INSERT INTO users (user_id, name) VALUES
  ('from_merge', 'From'),
  ('to_merge', 'To');
INSERT INTO user_flights (
  flight_id, user_id, origin, destination, flight_type,
  departure_date, airline, passengers, total_price, date_found
) VALUES (
  '77777777-7777-4777-8777-777777777777',
  'from_merge', 'Пермь', 'Сочи', 'oneWay',
  '2026-10-01', 'SU', 1, 6000, '2026-09-01'
);
INSERT INTO user_identities (user_id, provider, provider_user_id) VALUES
  ('from_merge', 'telegram', 'tg_from_merge');
SELECT public.reassign_owner('from_merge', 'to_merge');
SELECT tests.expect(
  (SELECT user_id FROM user_flights WHERE flight_id = '77777777-7777-4777-8777-777777777777') = 'to_merge',
  'reassign_owner should move flights to the canonical user'
);
SELECT tests.expect(
  (SELECT user_id FROM user_identities WHERE provider_user_id = 'tg_from_merge') = 'to_merge',
  'reassign_owner should move identities to the canonical user'
);

-- Anon can look up an active invite and cannot read flights.
SET ROLE anon;
SELECT tests.expect(
  (SELECT count(*) FROM lookup_share_invite('view_token_active') WHERE permissions = 'view') = 1,
  'anon RPC should return an active invite'
);
SELECT tests.expect(
  (SELECT count(*) FROM lookup_share_invite('view_token_revoked')) = 0,
  'anon RPC should hide revoked invites'
);
SELECT tests.expect(
  (SELECT count(*) FROM lookup_share_invite('hashed_only_token')) = 1,
  'anon RPC should find an invite stored only as token_hash'
);

DO $$
BEGIN
  PERFORM 1 FROM user_flights;
  RAISE EXCEPTION 'RLS test failed: anon selected user_flights';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '', false);
SELECT tests.expect(TRUE, 'RLS suite finished');
