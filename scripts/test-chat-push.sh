#!/usr/bin/env bash
set -euo pipefail

API="${API:-http://127.0.0.1:4000}"
EMAIL="${EMAIL:-sample1@divergram.local}"
PASS="${PASS:-Password123!}"
ROOM_ID="${ROOM_ID:-bulk_room_1}"
PLATFORM="${PLATFORM:-android}"
PUSH_TOKEN="${PUSH_TOKEN:-TEST_DEVICE_TOKEN_123}"

printf "[1] login...\n"
TOKEN=$(curl -s "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

if [[ -z "$TOKEN" ]]; then
  echo "로그인 실패: TOKEN 없음"
  exit 1
fi
echo "OK login"

printf "[2] register push token...\n"
curl -s "$API/api/push/tokens" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"platform\":\"$PLATFORM\",\"push_token\":\"$PUSH_TOKEN\"}"
echo
echo "OK token registered"

printf "[3] send message...\n"
curl -s "$API/api/chat/rooms/$ROOM_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"content":"queue+push integration test"}'
echo
echo "OK message sent"

printf "[4] done. worker 로그 / DB 상태를 확인하세요.\n"
