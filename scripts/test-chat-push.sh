#!/usr/bin/env bash
set -euo pipefail

API="${API:-http://127.0.0.1:4000}"
EMAIL="${EMAIL:-sample1@divergram.local}"
PASS="${PASS:-Password123!}"
ROOM_ID="${ROOM_ID:-}"
PLATFORM="${PLATFORM:-android}"
PUSH_TOKEN="${PUSH_TOKEN:-TEST_DEVICE_TOKEN_123}"

jget(){ python3 -c "import sys,json;print(json.load(sys.stdin).get('$1',''))"; }

echo "[1] login..."
LOGIN=$(curl -sS "$API/api/auth/login" -H 'Content-Type: application/json' -d "{"email":"$EMAIL","password":"$PASS"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")
[[ -n "$TOKEN" ]] || { echo "로그인 실패"; echo "$LOGIN"; exit 1; }
echo "OK login"

echo "[2] register push token..."
HTTP=$(curl -sS -o /tmp/push_resp.json -w "%{http_code}" "$API/api/push/tokens"   -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'   -d "{"platform":"$PLATFORM","push_token":"$PUSH_TOKEN"}")
[[ "$HTTP" == "200" ]] || { echo "토큰 등록 실패 HTTP=$HTTP"; cat /tmp/push_resp.json; exit 1; }
cat /tmp/push_resp.json; echo

if [[ -z "$ROOM_ID" ]]; then
  ROOM_ID=$(curl -sS "$API/api/chat/rooms" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);r=d.get('rooms') or []; print((r[0].get('id') if r else ''))")
fi
[[ -n "$ROOM_ID" ]] || { echo "ROOM_ID 없음 (직접 ROOM_ID=... 지정 필요)"; exit 1; }

echo "[3] send message room=$ROOM_ID"
HTTP=$(curl -sS -o /tmp/msg_resp.json -w "%{http_code}" "$API/api/chat/rooms/$ROOM_ID/messages"   -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'   -d '{"content":"queue+push integration test"}')
[[ "$HTTP" == "200" ]] || { echo "메시지 전송 실패 HTTP=$HTTP"; cat /tmp/msg_resp.json; exit 1; }
cat /tmp/msg_resp.json; echo

echo "[4] done"
