# Divergram Google Play 준비 문서

이 문서는 Google Play 첫 등록 이후 바로 제출할 수 있도록, 앱 정보와 스토어 문구, 자산, 남은 수동 작업을 한 곳에 정리한 내부 준비 문서입니다.

## 기본 정보
- 앱 이름: Divergram
- 패키지명: `com.divergram.app`
- Android versionName: `1.1`
- Android versionCode: `9`
- 배포 트랙: `internal`
- 제출 방식: Google Play Console + EAS Submit

## 스토어 문구
- 제목: Divergram
- 짧은 설명: 다이버를 위한 피드·포인트·로그북 앱
- 소개 문구: 다이빙을 기록하고, 포인트를 발견하고, 경험을 공유하는 다이버 전용 플랫폼입니다.

## 주요 기능 설명
- 피드: 수중 사진, 영상, 다이빙 리뷰와 경험 공유
- 포인트 지도: 다이빙 포인트와 리조트 탐색
- 다이빙 로그: 수심, 수온, 버디, 장비, 위치 기록
- 프로필: 다이빙 이력, 즐겨찾기, 게시물, 릴스 정리
- 다국어 및 다크모드 지원
- Bluetooth 기반 다이빙 컴퓨터 연동 흐름

## 스토어 자산
- Feature graphic: `fastlane/metadata/android/ko-KR/images/featureGraphic.png`
- Phone screenshots:
  - `fastlane/metadata/android/ko-KR/images/phoneScreenshots/01_login.png`
  - `fastlane/metadata/android/ko-KR/images/phoneScreenshots/02_tutorial_step1.png`
  - `fastlane/metadata/android/ko-KR/images/phoneScreenshots/03_tutorial_step3.png`
  - `fastlane/metadata/android/ko-KR/images/phoneScreenshots/04_splash.png`
  - `fastlane/metadata/android/ko-KR/images/phoneScreenshots/05_tutorial_ipad.png`

## 제출용 메타데이터 파일
- `fastlane/metadata/android/ko-KR/title.txt`
- `fastlane/metadata/android/ko-KR/short_description.txt`
- `fastlane/metadata/android/ko-KR/full_description.txt`
- `fastlane/metadata/android/ko-KR/changelogs/9.txt`
- `fastlane/metadata/android/ko-KR/contact_email.txt`
- `fastlane/metadata/android/ko-KR/contact_website.txt`
- `fastlane/metadata/android/ko-KR/privacy_policy.txt`

## Data Safety 준비 메모
다음 항목은 Play Console Data safety 폼에 반영해야 합니다.
- 이메일
- 닉네임
- 프로필 이미지
- 휴대폰 번호
- 로그인 연동 정보
- GPS 위치
- 다이빙 위치
- DiveLog 데이터
- 장비 정보
- Bluetooth 기기 정보
- IP 주소 / 기기 정보
- 푸시 토큰
- 사진 및 영상
- 자격증 정보
- Instagram 링크
- AI 기능 사용 데이터

## 앱 접근(App access) 메모
- 앱은 로그인 기반이므로 리뷰어가 접근 가능한 테스트 계정 또는 접근 안내가 필요합니다.
- 간편 로그인(구글/애플)과 이메일 로그인 흐름을 안내 문구에 포함해야 합니다.

## 콘텐츠 등급 / 정책 체크 메모
- 커뮤니티 UGC, 사진/영상, 위치 정보, 다이빙 안전 고지, AI 기능 고지를 기준으로 검토가 필요합니다.
- 정확한 선택값은 Play Console의 질문에 맞춰 수동 입력해야 합니다.

## 현재 남은 수동 작업
1. Google 계정 신원 확인 완료
2. 연락처 전화번호 인증 완료
3. Play Console에서 `com.divergram.app` 첫 앱 생성 완료
4. 내부 테스트 트랙에 첫 릴리스 저장
5. 승인 후 EAS Submit 또는 Play Console 업로드 재시도

## 자동 준비 완료 항목
- Android 릴리스 버전 코드 상향 조정
- 스토어 문구/설명 정리
- Feature graphic 및 스크린샷 정리
- Google Play 제출용 서비스 계정 연결 준비
