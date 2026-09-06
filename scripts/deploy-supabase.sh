#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Deploying Edge Functions..."

supabase functions deploy auth-telegram --no-verify-jwt
supabase functions deploy auth-guest --no-verify-jwt

if [ "${DEPLOY_AUTH_DEV:-}" = "true" ]; then
  echo "DEPLOY_AUTH_DEV=true — deploying auth-dev (staging only)"
  supabase functions deploy auth-dev --no-verify-jwt
else
  echo "Skipping auth-dev. Set DEPLOY_AUTH_DEV=true only for staging."
fi

echo "Done. Ensure secrets are set:"
echo "  supabase secrets set BOT_TOKEN=..."
echo "  supabase secrets set JWT_SECRET=..."
echo "  supabase secrets set ALLOW_DEV_AUTH=false  # production"
echo "Apply pending migrations with: supabase db push"
