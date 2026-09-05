#!/usr/bin/env bash
# Sync new Throve backend env vars from backend/.env to the linked Railway service.
# Usage (from repo root, after `railway login` / link):
#   bash scripts/sync-railway-new-env.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "Railway CLI not found. Install: https://docs.railway.com/guides/cli"
  exit 1
fi

get_env() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  echo "${line#*=}"
}

KEYS=(
  PAYMENT_MODE
  PAYMENT_REDIRECT_URL
  FLW_PUBLIC_KEY
  FLW_SECRET_KEY
  FLW_ENCRYPTION_KEY
  FLW_SECRET_HASH
  GOOGLE_MAPS_API_KEY
)

echo "Setting Railway variables from backend/.env …"
for key in "${KEYS[@]}"; do
  value="$(get_env "$key")"
  if [[ -z "$value" && "$key" != PAYMENT_MODE && "$key" != PAYMENT_REDIRECT_URL ]]; then
    echo "  skip $key (empty locally)"
    # Still create the key so it's visible in Railway for later fill-in
    railway variable set "${key}=" --skip-deploys >/dev/null
    continue
  fi
  if [[ -z "$value" ]]; then
    case "$key" in
      PAYMENT_MODE) value="simulate" ;;
      PAYMENT_REDIRECT_URL) value="throveapp://checkout/payment-return" ;;
    esac
  fi
  echo "  set $key"
  railway variable set "${key}=${value}" --skip-deploys >/dev/null
done

echo "Done. Trigger a redeploy from the Railway dashboard (or unset --skip-deploys next time)."
railway variable list 2>/dev/null | grep -E 'PAYMENT_|FLW_|GOOGLE_MAPS' || true
