#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-postgres}"
export PGDATABASE="${PGDATABASE:-flight_tracker}"

psql=(psql -v ON_ERROR_STOP=1)

"${psql[@]}" -f "$ROOT/supabase/tests/ci_bootstrap.sql"
"${psql[@]}" -f "$ROOT/supabase/migrations/001_schema.sql"
"${psql[@]}" -f "$ROOT/supabase/migrations/002_rls.sql"
"${psql[@]}" -f "$ROOT/supabase/migrations/003_guest_session_rls.sql"
"${psql[@]}" -f "$ROOT/supabase/migrations/004_lookup_share_invite.sql"
"${psql[@]}" -f "$ROOT/supabase/migrations/005_flight_notes.sql"
"${psql[@]}" -f "$ROOT/supabase/tests/rls.sql"

echo "RLS tests passed"
