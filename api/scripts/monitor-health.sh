#!/usr/bin/env bash
set -euo pipefail

HEALTH_URL="${DIVERGRAM_HEALTH_URL:-https://api.divergram.com/api/health}"
STATE_FILE="${DIVERGRAM_HEALTH_STATE_FILE:-/var/lib/divergram-health/failures}"
WEBHOOK_URL="${DIVERGRAM_ALERT_WEBHOOK_URL:-}"
ALERT_EMAIL="${DIVERGRAM_ALERT_EMAIL:-}"
NODE_BINARY="${DIVERGRAM_NODE_BINARY:-node}"
EMAIL_ALERT_SCRIPT="${DIVERGRAM_EMAIL_ALERT_SCRIPT:-/home/divergram/api/scripts/send-health-alert.mjs}"
mkdir -p "$(dirname "$STATE_FILE")"

send_email_alert() {
  local subject="$1"
  local message="$2"
  if [[ -z "$ALERT_EMAIL" || ! -f "$EMAIL_ALERT_SCRIPT" ]]; then
    return 0
  fi
  if ! DIVERGRAM_ALERT_EMAIL="$ALERT_EMAIL" "$NODE_BINARY" "$EMAIL_ALERT_SCRIPT" "$subject" "$message"; then
    logger -t divergram-health "failed to send email alert to configured recipient"
  fi
}

if response="$(curl -fsS --max-time 15 "$HEALTH_URL")" && grep -q '"ok"[[:space:]]*:[[:space:]]*true' <<<"$response"; then
  previous_failures="$(cat "$STATE_FILE" 2>/dev/null || printf '0')"
  printf '0' >"$STATE_FILE"
  if [[ "$previous_failures" -ge 3 ]]; then
    send_email_alert "[Divergram] API recovered" "Divergram API recovered after ${previous_failures} consecutive failed checks: ${HEALTH_URL}"
  fi
  exit 0
fi

failures=$(( $(cat "$STATE_FILE" 2>/dev/null || printf '0') + 1 ))
printf '%s' "$failures" >"$STATE_FILE"
logger -t divergram-health "health check failed (${failures}): ${HEALTH_URL}"

should_alert=false
if [[ "$failures" -eq 3 || ( "$failures" -gt 3 && $(( failures % 12 )) -eq 0 ) ]]; then
  should_alert=true
fi

if [[ "$should_alert" == true && -n "$WEBHOOK_URL" ]]; then
  payload="$(printf '{"text":"Divergram API health check failed %s consecutive times: %s"}' "$failures" "$HEALTH_URL")"
  curl -fsS --max-time 15 -H 'Content-Type: application/json' -d "$payload" "$WEBHOOK_URL" >/dev/null
fi

if [[ "$should_alert" == true ]]; then
  send_email_alert "[Divergram] API health check failed" "Divergram API health check failed ${failures} consecutive times: ${HEALTH_URL}"
fi

exit 1
