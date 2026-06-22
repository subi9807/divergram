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

## 5) Android / Google Play 준비 메모

### 기본 제출 경로
- 패키지명: `com.divergram.app`
- 배포 트랙: `internal`
- 서비스 계정 키: `.secrets/google-play-service-account.json`
- fastlane metadata 경로: `fastlane/metadata/android`

### Android 스토어 문구/자산
- 제목: `Divergram`
- 짧은 설명: `다이버를 위한 피드·포인트·로그북 앱`
- 상세 설명: `fastlane/metadata/android/ko-KR/full_description.txt`
- 변경사항: `fastlane/metadata/android/ko-KR/changelogs/9.txt`
- Feature graphic: `fastlane/metadata/android/ko-KR/images/featureGraphic.png`
- 스크린샷: `fastlane/metadata/android/ko-KR/images/phoneScreenshots/`

### 수동으로 남는 작업
- Google 계정 신원 확인
- 연락처 전화번호 인증
- Play Console에서 `com.divergram.app` 첫 앱 생성
- 내부 테스트 릴리스 1회 저장
- 이후 EAS Submit 재시도
