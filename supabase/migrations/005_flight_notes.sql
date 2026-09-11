-- Optional free-text note on a ticket. The Mini App caps input at 500 characters.

ALTER TABLE user_flights
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN user_flights.notes IS 'Optional ticket note; Mini App max 500 chars';
