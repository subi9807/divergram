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
- 메타데이터(ko)
- 스크린샷(iphone/ipad 혼합)
- 미리보기 영상
- 바이너리 업로드는 제외 (`skip_binary_upload: true`)

## 4) 현재 에셋 경로
- 스크린샷: `fastlane/screenshots/ko`
- 미리보기 영상: `fastlane/preview/ko/iphone/app_preview_iphone.mov`
- 메타데이터: `fastlane/metadata/ko`

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
- Feature graphic: `fastlane/graphics/playstore_feature_graphic_1024x500.png`
- 스크린샷: `fastlane/metadata/android/ko-KR/images/phoneScreenshots/`

### Android 제출 권한 이슈
현재 자동 제출은 아래 오류로 막혔다.
- `The service account is missing the necessary permissions to submit the app to Google Play Store.`
- 서비스 계정: `divergram@divergram-495603.iam.gserviceaccount.com`

해결 순서:
1. Play Console > API 액세스에서 서비스 계정 연결 확인
2. 앱 `com.divergram.app`에 대한 업로드/내부 테스트 권한 부여
3. 내부 테스트 트랙을 먼저 저장
4. 동일 계정으로 EAS Submit 재시도

### 수동으로 남는 작업
- Google 계정 신원 확인
- 연락처 전화번호 인증
- Play Console에서 앱 생성 및 내부 테스트 릴리스 저장
- 이후 EAS Submit 재시도
