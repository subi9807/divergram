#!/usr/bin/env bash
set -euo pipefail

HEALTH_URL="${DIVERGRAM_HEALTH_URL:-https://api.divergram.com/api/health}"
STATE_FILE="${DIVERGRAM_HEALTH_STATE_FILE:-/var/lib/divergram-health/failures}"
WEBHOOK_URL="${DIVERGRAM_ALERT_WEBHOOK_URL:-}"
mkdir -p "$(dirname "$STATE_FILE")"

if response="$(curl -fsS --max-time 15 "$HEALTH_URL")" && grep -q '"ok"[[:space:]]*:[[:space:]]*true' <<<"$response"; then
  printf '0' >"$STATE_FILE"
  exit 0
fi

failures=$(( $(cat "$STATE_FILE" 2>/dev/null || printf '0') + 1 ))
printf '%s' "$failures" >"$STATE_FILE"
logger -t divergram-health "health check failed (${failures}): ${HEALTH_URL}"

if [[ "$failures" -ge 3 && -n "$WEBHOOK_URL" ]]; then
  payload="$(printf '{"text":"Divergram API health check failed %s consecutive times: %s"}' "$failures" "$HEALTH_URL")"
  curl -fsS --max-time 15 -H 'Content-Type: application/json' -d "$payload" "$WEBHOOK_URL" >/dev/null
fi

exit 1
