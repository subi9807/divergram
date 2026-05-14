#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "[1/3] starting API"
osascript -e 'tell application "Terminal" to do script "cd /Users/seowoo/Desktop/Works/divergram && bash run-local-api.sh"' >/dev/null 2>&1 || true

echo "[2/3] starting Web"
osascript -e 'tell application "Terminal" to do script "cd /Users/seowoo/Desktop/Works/divergram && bash run-local-web.sh"' >/dev/null 2>&1 || true

echo "[3/3] starting Admin"
osascript -e 'tell application "Terminal" to do script "cd /Users/seowoo/Desktop/Works/divergram && bash run-local-admin.sh"' >/dev/null 2>&1 || true

echo "Started local API/Web/Admin in new Terminal windows."
