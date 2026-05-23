#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${DIVERGRAM_API_BASE:-https://api.divergram.com/api}"
PASS="${DIVERGRAM_QA_PASSWORD:-Qwerty!2345}"
USERNAME_PREFIX="${DIVERGRAM_QA_USERNAME_PREFIX:-qa_diver}"

rand_suffix="$(date +%s)$RANDOM"
email="qa${rand_suffix}@example.com"
username="${USERNAME_PREFIX}_${RANDOM}"

signup_payload="$(cat <<JSON
{"email":"$email","password":"$PASS","username":"$username"}
JSON
)"

signup_resp="$(curl -sS -X POST "$BASE_URL/auth/signup" -H 'Content-Type: application/json' -d "$signup_payload")"
token="$(printf '%s' "$signup_resp" | node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(String(j.token||''));")"

if [[ -z "$token" ]]; then
  echo "FAIL: signup token missing"
  echo "$signup_resp"
  exit 1
fi

echo "BASE_URL=$BASE_URL"
echo "TEST_USER_EMAIL=$email"
echo "TOKEN_LEN=${#token}"

request() {
  local name="$1"
  local method="$2"
  local path="$3"
  local body="${4:-}"
  local tmp_body
  tmp_body="$(mktemp)"

  local status
  if [[ -n "$body" ]]; then
    status="$(curl -sS -o "$tmp_body" -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $token" -H 'Content-Type: application/json' -d "$body")"
  else
    status="$(curl -sS -o "$tmp_body" -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $token")"
  fi

  echo "[$name] $method $path -> $status"
  cat "$tmp_body"
  echo
  rm -f "$tmp_body"
}

request_public() {
  local name="$1"
  local method="$2"
  local path="$3"
  local body="${4:-}"
  local tmp_body
  tmp_body="$(mktemp)"

  local status
  if [[ -n "$body" ]]; then
    status="$(curl -sS -o "$tmp_body" -w "%{http_code}" -X "$method" "$BASE_URL$path" -H 'Content-Type: application/json' -d "$body")"
  else
    status="$(curl -sS -o "$tmp_body" -w "%{http_code}" -X "$method" "$BASE_URL$path")"
  fi

  echo "[$name] $method $path -> $status"
  cat "$tmp_body"
  echo
  rm -f "$tmp_body"
}

request "NOTIFICATIONS_GET" "GET" "/notifications/settings"
request "NOTIFICATIONS_PATCH" "PATCH" "/notifications/settings" '{"pushEnabled":true,"items":{"like":true,"comment":false,"follow":true,"marine_weather_alert":true,"dive_schedule":false,"sync_complete":true,"sync_failed":true}}'
request "PUSH_TEST" "POST" "/push/test" '{"title":"QA","body":"test","data":{"source":"script"}}'
request "CLOUDINARY_SIGN" "POST" "/media/cloudinary/sign-upload" '{"resourceType":"image","fileName":"qa-check.jpg","folder":"divergram"}'
request "CLOUDINARY_DELETE" "POST" "/media/cloudinary/delete" '{"url":"https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg","resourceType":"image"}'
cert_id="cert_${rand_suffix}"
request "CERT_CREATE" "POST" "/data/certifications" "{\"rows\":[{\"id\":\"${cert_id}\",\"user_id\":\"me\",\"agency\":\"PADI\",\"certification_number\":\"QA-${rand_suffix}\",\"level\":\"Open Water\",\"status\":\"reviewing\",\"created_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"updated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}]}"
request "CERT_STATUS_PATCH" "PATCH" "/data/certifications" "{\"filters\":[{\"column\":\"id\",\"op\":\"eq\",\"value\":\"${cert_id}\"}],\"patch\":{\"status\":\"verified\",\"updated_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"
request_public "OAUTH_PROVIDERS" "GET" "/auth/oauth/providers"
request_public "OAUTH_MOBILE_INVALID_TOKEN" "POST" "/auth/oauth/mobile" '{"provider":"google","accessToken":"invalid_test_token","sessionDays":7}'

echo "DONE: prod api integration smoke finished."
