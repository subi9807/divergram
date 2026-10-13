#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/kimseokgeun/Desktop/Works/divergram"
APP="$ROOT/app"
OUT="$ROOT/artifacts/simulator-captures"
BUNDLE_ID="com.divergram.app.ios"
PORT=8081

routes=(
  "/(auth)/login"
  "/(tabs)/feed"
  "/(tabs)/explore"
  "/(tabs)/resorts"
  "/(tabs)/profile"
  "/(tabs)/reels"
  "/(tabs)/logs"
  "/(tabs)/license-management"
)
files=(
  "01-login.png"
  "02-feed.png"
  "03-explore.png"
  "04-resorts.png"
  "05-profile.png"
  "06-reels.png"
  "07-dive-log.png"
  "08-license.png"
)

cleanup_metro() {
  local listeners
  listeners=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$listeners" ]]; then kill $listeners 2>/dev/null || true; fi
  sleep 2
}
trap cleanup_metro EXIT

mkdir -p "$OUT" /tmp/divergram-capture
xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4

capture_locales=("${@:-ko en ja zh}")
for locale_group in "${capture_locales[@]}"; do
  for locale in $locale_group; do
  cleanup_metro
  mkdir -p "$OUT/$locale"
  preview=$(printf '{"enabled":true,"token":"layout-preview-token","locale":"%s","route":"/(auth)/login"}' "$locale")
  (
    cd "$APP"
    EXPO_PUBLIC_LAYOUT_PREVIEW_JSON="$preview" npm exec -- expo start --dev-client --port "$PORT" >"/tmp/divergram-capture/metro-$locale.log" 2>&1
  ) &
  metro_pid=$!
  for _ in {1..45}; do
    if curl -fsS "http://127.0.0.1:$PORT/status" 2>/dev/null | grep -q running; then break; fi
    sleep 1
  done
  xcrun simctl terminate booted "$BUNDLE_ID" 2>/dev/null || true
  xcrun simctl openurl booted "divergram://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$PORT"
  sleep 8
  for index in "${!routes[@]}"; do
    xcrun simctl openurl booted "divergram://${routes[$index]}"
    sleep 5
    xcrun simctl io booted screenshot "$OUT/$locale/${files[$index]}"
  done
  kill "$metro_pid" 2>/dev/null || true
  done
done

echo "Captured localized simulator screens in $OUT"
