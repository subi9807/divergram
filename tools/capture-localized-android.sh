#!/usr/bin/env bash
set -euo pipefail

ROOT="/Users/kimseokgeun/Desktop/Works/divergram"
APP="$ROOT/app"
OUT="$ROOT/artifacts/store-captures/android"
SERIAL="${ANDROID_SERIAL:-emulator-5556}"
PORT="${EXPO_PORT:-8081}"
PACKAGE="com.divergram.app"
GIT_BIN="/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin"

routes=(
  "feed"
  "explore"
  "resorts"
  "logs"
  "dive-guide"
  "profile"
  "license-management"
  "reels"
)
files=(
  "01-feed.png"
  "02-explore.png"
  "03-resorts.png"
  "04-dive-log.png"
  "05-guide.png"
  "06-profile.png"
  "07-license.png"
  "08-reels.png"
)

metro_pid=""

stop_metro() {
  if [[ -n "$metro_pid" ]]; then
    kill "$metro_pid" 2>/dev/null || true
    wait "$metro_pid" 2>/dev/null || true
    metro_pid=""
  fi
  local listeners
  listeners=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$listeners" ]]; then
    kill $listeners 2>/dev/null || true
  fi
  sleep 2
}

cleanup() {
  stop_metro
}
trap cleanup EXIT

wait_for_metro() {
  for _ in {1..90}; do
    if curl -fsS "http://127.0.0.1:$PORT/status" 2>/dev/null | grep -q running; then
      return 0
    fi
    sleep 1
  done
  echo "Metro did not start on port $PORT" >&2
  return 1
}

configure_device() {
  adb -s "$SERIAL" wait-for-device
  adb -s "$SERIAL" reverse "tcp:$PORT" "tcp:$PORT"
  adb -s "$SERIAL" shell pm grant "$PACKAGE" android.permission.ACCESS_FINE_LOCATION 2>/dev/null || true
  adb -s "$SERIAL" shell pm grant "$PACKAGE" android.permission.ACCESS_COARSE_LOCATION 2>/dev/null || true
  adb -s "$SERIAL" shell pm grant "$PACKAGE" android.permission.POST_NOTIFICATIONS 2>/dev/null || true
  # Store-preview data uses a deterministic location, so keep system location off.
  # Enabling it here opens Google's Location Accuracy consent dialog on clean AVDs.
  adb -s "$SERIAL" shell settings put secure location_mode 0 2>/dev/null || true
  # Close any system dialog left behind by an earlier capture run.
  adb -s "$SERIAL" shell input keyevent 4 >/dev/null 2>&1 || true

  adb -s "$SERIAL" shell settings put global sysui_demo_allowed 1
  adb -s "$SERIAL" shell am broadcast -a com.android.systemui.demo -e command enter >/dev/null
  adb -s "$SERIAL" shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941 >/dev/null
  adb -s "$SERIAL" shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false >/dev/null
  adb -s "$SERIAL" shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 >/dev/null
  adb -s "$SERIAL" shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false >/dev/null
}

capture_locale() {
  local locale="$1"
  local preview
  local preview_route="/(tabs)/feed"
  local locale_out="$OUT/$locale"
  local log_file="/tmp/divergram-store-capture-metro-$locale.log"
  if [[ -n "${CAPTURE_ONLY:-}" ]]; then
    preview_route="/(tabs)/$CAPTURE_ONLY"
  fi
  preview=$(printf '{"tutorialDone":true,"auth":{"token":"layout-preview-token","user":{"id":"store-preview-user","email":"preview@divergram.com","name":"Divergram"}},"locale":"%s","route":"%s"}' "$locale" "$preview_route")

  stop_metro
  mkdir -p "$locale_out"
  (
    cd "$APP"
    PATH="$GIT_BIN:$PATH" EXPO_PUBLIC_LAYOUT_PREVIEW_JSON="$preview" \
      npm exec -- expo start --clear --dev-client --port "$PORT" --host lan >"$log_file" 2>&1
  ) &
  metro_pid=$!
  wait_for_metro

  adb -s "$SERIAL" shell am force-stop "$PACKAGE"
  adb -s "$SERIAL" shell am start -W -a android.intent.action.VIEW \
    -d "divergram://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$PORT" "$PACKAGE" >/dev/null
  sleep 18
  # A clean Google-enabled emulator can show a one-time Location Accuracy dialog
  # before Expo Router handles the first deep link.
  adb -s "$SERIAL" shell input tap 480 1750 >/dev/null 2>&1 || true
  sleep 1

  for index in "${!routes[@]}"; do
    if [[ -n "${CAPTURE_ONLY:-}" && "${routes[$index]}" != "$CAPTURE_ONLY" ]]; then
      continue
    fi
    adb -s "$SERIAL" shell "am start -W -a android.intent.action.VIEW -d 'divergram://${routes[$index]}' $PACKAGE" >/dev/null
    sleep 6
    if [[ "${routes[$index]}" == "resorts" ]]; then
      # Dismiss the one-time Google location accuracy prompt without enabling data collection.
      adb -s "$SERIAL" shell input tap 480 1750 >/dev/null 2>&1 || true
      sleep 1
      adb -s "$SERIAL" shell "am start -W -a android.intent.action.VIEW -d 'divergram://${routes[$index]}' $PACKAGE" >/dev/null
      sleep 6
    fi
    sleep 1
    adb -s "$SERIAL" exec-out screencap -p >"$locale_out/${files[$index]}"
  done
}

configure_device
locales=("${@:-ko en ja zh}")
for locale_group in "${locales[@]}"; do
  for locale in $locale_group; do
    capture_locale "$locale"
  done
done

echo "Captured Android store screens in $OUT"
