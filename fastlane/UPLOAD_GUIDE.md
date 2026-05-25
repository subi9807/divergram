# App Store Connect 메타데이터 업로드 가이드

## 1) 필요 인증값
권장: App Store Connect API Key 방식
- `ASC_API_KEY_ID`
- `ASC_API_ISSUER_ID`
- `ASC_API_KEY_PATH` (AuthKey_XXXX.p8 절대경로)

대안: Apple ID + 앱 전용 암호 방식
- `APPSTORECONNECT_USER`
- `APPSTORECONNECT_APP_PASSWORD`
- `APPSTORE_PROVIDER_ID` (여러 provider 계정일 때 필수)

추가(선택)
- `APP_IDENTIFIER` (기본값 `com.divergram.app.ios`)

## 2) 업로드 실행
```bash
cd /Volumes/WD_Elements/Works/divergram_app
fastlane ios upload_store_assets
```

## 3) 업로드 범위
- 메타데이터(ko-KR)
- 스크린샷(iphone/ipad 혼합)
- 바이너리 업로드는 제외 (`skip_binary_upload: true`)

## 4) 현재 에셋 경로
- 스크린샷: `fastlane/screenshots/ko-KR`
- 미리보기 영상: `fastlane/preview/ko-KR/iphone/app_preview_iphone.mov`
- 메타데이터: `fastlane/metadata/ko-KR`
