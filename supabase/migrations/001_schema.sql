-- Flight Tracker schema (run in Supabase SQL Editor)

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_flights (
  flight_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  flight_type TEXT NOT NULL CHECK (flight_type IN ('oneWay', 'roundTrip')),
  departure_date DATE NOT NULL,
  return_date DATE,
  departure_time TEXT,
  arrival_time TEXT,
  return_departure_time TEXT,
  return_arrival_time TEXT,
  is_direct_there BOOLEAN DEFAULT FALSE,
  is_direct_back BOOLEAN DEFAULT FALSE,
  layover_city_there TEXT,
  layover_duration_there TEXT,
  layover_city_back TEXT,
  layover_duration_back TEXT,
  airline TEXT,
  passengers SMALLINT DEFAULT 1 CHECK (passengers BETWEEN 1 AND 4),
  total_price NUMERIC(12, 2) DEFAULT 0,
  date_found DATE,
  arrival_next_day BOOLEAN DEFAULT FALSE,
  return_arrival_next_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_flights_user_id ON user_flights(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flights_departure ON user_flights(departure_date);

CREATE TABLE IF NOT EXISTS shared_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,
  permissions TEXT NOT NULL CHECK (permissions IN ('view', 'edit')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shared_sessions_token ON shared_sessions(token);
CREATE INDEX IF NOT EXISTS idx_shared_sessions_owner ON shared_sessions(owner_id);
