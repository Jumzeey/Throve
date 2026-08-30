#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing backend/.env — copy backend/.env.example and fill in values."
  exit 1
fi

read_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r'
}

SUPABASE_URL="$(read_env SUPABASE_URL)"
SUPABASE_DB_PASSWORD="$(read_env SUPABASE_DB_PASSWORD)"
PROJECT_REF="${SUPABASE_URL#https://}"
PROJECT_REF="${PROJECT_REF%%.supabase.co}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_DB_PASSWORD" ]]; then
  echo "Set SUPABASE_URL and SUPABASE_DB_PASSWORD in backend/.env"
  echo "  Dashboard → Project Settings → Database → Database password"
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Install Supabase CLI: brew install supabase/tap/supabase"
  exit 1
fi

cd "$ROOT"

echo "Linking project $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF" -p "$SUPABASE_DB_PASSWORD"

echo "Pushing migrations..."
supabase db push

echo "Done. Verify: curl http://localhost:4000/listings"
