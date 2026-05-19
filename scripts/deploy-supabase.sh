#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Deploying Edge Functions..."

supabase functions deploy auth-telegram --no-verify-jwt
supabase functions deploy auth-guest --no-verify-jwt
supabase functions deploy auth-dev --no-verify-jwt
supabase functions deploy create-pro-invoice --no-verify-jwt

echo "Done. Ensure secrets are set:"
echo "  supabase secrets set BOT_TOKEN=..."
echo "  supabase secrets set JWT_SECRET=..."
echo "  supabase secrets set ALLOW_DEV_AUTH=false  # production"
