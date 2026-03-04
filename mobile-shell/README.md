# Divergram Mobile Shell (Expo + WebView)

WebView 기반 앱 셸 + 네이티브 브릿지(GPS/BLE/Push) 프로젝트.

## Run (Dev Client 권장)

```bash
cd mobile-shell
npm install
npx expo prebuild
npm run ios      # iOS 시뮬레이터/디바이스
npm run android  # Android 에뮬레이터/디바이스
```

BLE 연동(`react-native-ble-plx`)은 **Expo Go 불가**이며 Dev Client/EAS 빌드가 필요합니다.

## EAS Build (iOS + Android)

```bash
cd mobile-shell
npx eas login
npx eas build:configure
npx eas build --platform ios --profile development
npx eas build --platform android --profile development
```

- `development` 프로필: 네이티브 기능(BLE/GPS/Push) 검증용
- `production` 프로필: 스토어 배포용

## Env

```bash
EXPO_PUBLIC_WEB_URL=https://divergram.com
```

## Web ↔ Native Bridge

웹에서 앱으로 요청:

```js
window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'request_gps' }));
window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'request_push_token' }));
window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'start_ble_scan' }));
window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'stop_ble_scan' }));
```

앱에서 웹으로 응답(onMessage):

- `gps_result` `{ ok, coords }`
- `push_token_result` `{ ok, platform, push_token }`
- `ble_device_found` `{ id, name, rssi }`
- `ble_scan_stopped` `{ ok }`
- `native_error` `{ scope, message }`

## Push registration flow

1. 웹에서 `request_push_token` 요청
2. 앱이 토큰 발급 후 `push_token_result` 전달
3. 웹이 `/api/push/tokens`로 `{ platform, push_token }` 전송

## Mobile UI Rule (중요)

- 모바일 화면에서는 **모달 사용 금지**
- 화면은 **페이지 이동(라우팅) 중심**으로 구성
- 예외: 메뉴 툴팁/가벼운 힌트 UI

## Notes

- iOS 실제 푸시는 Apple Developer 설정(APNs key/cert) 필요
- Android 푸시는 Firebase 프로젝트와 앱 패키지 연결 필요
