# Divergram Mobile Shell (Expo + WebView)

WebView 기반 앱 셸 + 네이티브 브릿지(GPS/BLE/Push) 프로젝트.

## Run

```bash
cd mobile-shell
npm install
npm run start
```

BLE 연동(`react-native-ble-plx`)은 Expo Go 대신 Dev Client/EAS 빌드가 필요합니다.

## Env

```bash
EXPO_PUBLIC_WEB_URL=https://divergram-260228.web.app
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

## Notes

- iOS 실제 푸시는 Apple Developer 설정(APNs key/cert) 필요
- Android 푸시는 Firebase 프로젝트와 앱 패키지 연결 필요
