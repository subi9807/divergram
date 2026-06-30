# Divergram 스토어 재배포 준비 체크리스트

## 1) iOS TestFlight 상태
- 현재 빌드 번호: `22`
- 빌드 산출물: `dist/divergram-ios-b22-retry.ipa`
- 업로드 결과: App Store Connect 전송 완료
- 확인 경로: https://appstoreconnect.apple.com/apps/6769253236/testflight/ios

## 2) Android Google Play 재등록 전 필수 확인
현재 EAS Submit 단계에서 아래 권한 오류가 발생했다.

- 오류 요약: `The service account is missing the necessary permissions to submit the app to Google Play Store.`
- 사용 서비스 계정: `divergram@divergram-495603.iam.gserviceaccount.com`
- 제출 트랙: `internal`

### Play Console 클릭 순서
1. [Play Console](https://play.google.com/console/u/1/developers/6964197428692659212/app-list) 접속
2. 앱 `Divergram` 선택
3. 왼쪽 메뉴에서 `Settings` 진입
4. `API access` 확인
5. 서비스 계정 `divergram@divergram-495603.iam.gserviceaccount.com` 연결 상태 확인
6. 앱 `com.divergram.app` 선택
7. `Users and permissions`에서 업로드/릴리스 권한 확인
8. 왼쪽 메뉴에서 `Test and release` > `Internal testing` 진입
9. 내부 테스트 릴리스를 저장하고 테스터를 추가
10. `App content`에서 개인정보처리방침, 광고 포함 여부, 데이터 안전성, 타겟 연령, 앱 액세스 정보를 확인
11. `Publishing overview`에서 남은 항목이 있으면 `Send for review` 실행

### 사용자 권한 추가 방법
1. `Users and permissions` 진입
2. `Invite new users` 선택
3. 초대할 이메일 입력
4. 아래 권한을 부여
   - `View app information`
   - `View and manage testing tracks`
   - `Manage store presence`
   - `Release to testing tracks`
   - 필요 시 `App permissions` 관련 접근
5. `Invite user` 저장

### 내부 테스터 추가 방법
1. `Test and release` > `Internal testing` 진입
2. `Testers` 탭에서 이메일 목록 또는 Google Group 지정
3. 최대 100명까지 추가 가능
4. `Save changes` 후 초대 링크 배포
5. 테스터는 Play Store 내부 테스트 링크로 설치

### 초대 링크 관련 메모
- 초대 링크는 Play Console이 자동 생성한다
- 앱이 `Published` 상태가 아니면 opt-in 링크가 바로 안 보일 수 있다
- 제가 직접 링크를 생성하는 기능은 없고, Play Console에서 생성된 링크를 복사해 공유해야 한다
- closed testing에서는 테스터가 먼저 링크로 opt-in 해야 참여로 집계된다

### 테스터 초대 문구
```text
안녕하세요. Divergram 내부 테스트에 초대합니다.

앱 설치 후 우선 확인해 주세요.
- 로그인
- 피드 열람 및 게시물 상세
- 포인트 지도
- 다이빙 로그 작성
- 프로필 및 설정
- Bluetooth 기기 검색

문제가 보이면 캡처와 함께 알려주시면 바로 반영하겠습니다.
```

### 재제출 순서
1. Play Console 권한 부여
2. `./node_modules/.bin/eas build -p android --profile production --auto-submit --wait --non-interactive`
3. 제출 로그에서 `Release track: internal` 확인
4. 완료 후 내부 테스터 배포 상태 확인

### 재제출 직전 체크리스트
- `applicationId`: `com.divergram.app`
- `versionCode`: `22`
- `versionName`: `1.2`
- 서비스 계정 연결 완료
- 앱 콘텐츠 항목 미완료 없음
- 개인정보처리방침 URL 입력 완료
- 광고 선언 완료
- 내부 테스트 트랙 저장 완료
- 테스터 이메일 목록 준비 완료

### 권한이 아직 없을 때의 대안
- 서비스 계정 권한이 해결되기 전까지는 `Internal app sharing`으로 임시 공유 가능
- 단, 운영 배포용이 아니므로 Play 내부 테스트 트랙 권한이 열리면 반드시 다시 제출해야 함

### 내부 테스터 배포 체크리스트
- 내부 테스터 목록 생성 완료
- 테스터 이메일 초대 완료
- 릴리스 노트 반영 완료
- 내부 트랙의 릴리스 상태가 `draft`가 아닌지 확인
- 테스터가 Play 스토어 내부 테스트 링크로 설치 가능해야 함
- 필요 시 `com.divergram.app`의 앱 액세스 예외가 없는지 확인

### 12명 채우기 템플릿
아래처럼 12명의 고유 Google 계정을 등록하고, 모두 링크로 참여하게 하면 돼.

| No | 이메일 | 참여 확인 |
| --- | --- | --- |
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |
| 6 |  |  |
| 7 |  |  |
| 8 |  |  |
| 9 |  |  |
| 10 |  |  |
| 11 |  |  |
| 12 |  |  |

### Play Console에서 링크 찾는 위치
1. `Test and release` > `Closed testing` 또는 `Internal testing` 진입
2. 해당 트랙의 `Testers` 탭 확인
3. 이메일 목록 또는 Google Group 선택
4. 테스터 설정을 저장하면 Play Console이 opt-in 링크를 제공
5. 링크가 안 보이면 앱 상태가 `Published`인지 확인
6. 링크는 복사해서 메일/메신저로 공유
7. 테스터는 링크를 눌러 `Become a tester` 또는 `Join`을 완료해야 집계됨

### 14일 운영 플랜
1. 오늘: 12명 초대 및 opt-in 완료
2. 오늘: 각 테스터가 내부 테스트 링크로 앱 설치
3. 오늘부터 14일: 최소 1회 이상 실행 기록 유지
4. 매일: 간단한 테스트 피드백 수집
5. 14일차: Production access 신청

### Production access 신청 답변 초안
```text
우리 앱 Divergram은 다이빙 SNS, 로그북, 포인트 지도 기능을 제공하는 서비스입니다.

테스트는 closed testing으로 진행했으며, 12명 이상의 테스터가 14일 이상 연속으로 opt-in 상태를 유지했습니다.
테스터들은 로그인, 피드 열람, 포인트 지도, 다이빙 로그 작성, 프로필, 설정, Bluetooth 기기 검색 흐름을 확인했습니다.

앱은 운영용 콘텐츠와 실제 스토어 메타데이터를 사용하고 있으며, 테스트 기간 동안 주요 결함을 수정했습니다.
프로덕션 배포를 통해 일반 사용자에게 안정적으로 제공할 준비가 되었습니다.
```

### 빠른 진행 팁
- 실제 지인/팀원 12명을 한 번에 초대
- 내부 테스트 링크는 같은 날 배포
- 테스터가 설치 후 앱을 1회 이상 열게 하기
- 중간에 테스터를 교체하지 말고 14일 연속 유지
- 신청 시 질문에 테스트 목적과 검증 항목을 간단히 적기

## 3) 공통 운영 메모
- 현재 앱 버전: `1.2`
- 현재 빌드 번호/코드: `22`
- 스토어 제출 전에 네이티브 버전과 `app.config.ts` 값이 모두 일치해야 함
