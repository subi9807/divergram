# Divergram 코드 점검 결과

점검일: 2026-09-05. 대상: 현재 로컬 작업 트리(커밋되지 않은 기존 변경 포함).

후속 수정 및 검증 결과: [SYSTEM_CODE_FIXES_2026-09-05.md](SYSTEM_CODE_FIXES_2026-09-05.md). 아래 내용은 수정 전 발견 사항과 재현 기록이다.

## 범위와 판정 기준

API 서버·DB 마이그레이션·앱·관리자·웹·배포 디렉토리의 427개 파일, 84,496줄을 파일별 해시/줄 수 목록으로 수집했다. 전체 자동 검사와 아래 주요 경로의 수동 추적을 수행했다. 이 수치는 모든 줄의 수동 검토 완료를 의미하지 않는다.

수동 추적: 공통 데이터 CRUD, JWT/관리자 권한, 이메일·전화 인증, 프로필 공개 응답, 미디어 업로드·삭제, 채팅방 참여, 예약 생성·취소·환불·관리자 변경, 파트너 외부 API, 피드·리조트 조회, 번역/알림, 외부 장비 연동.

운영 서버/DB 변경, 실제 사용자 계정 공격, 실제 Cloudinary 삭제, 실결제, 스토어 배포는 실행하지 않았다. 소스 수정 대신 독립 점검 스크립트와 이 보고서를 추가했다. 운영 반영 여부는 별도 확인이 필요하다.

## 발견 사항

### 1. [P1] INSERT의 충돌 갱신으로 타인 게시물 소유권 변경 가능

- 위치: `api/server/routes/data.js:263`, `api/server/routes/data.js:280`
- 원인: 요청 본문의 `user_id`만 검사한 뒤, 전달된 ID에 대해 `ON CONFLICT (id) DO UPDATE`한다. 기존 행의 소유자를 조회하지 않는다.
- 영향: 알려진 타인 게시물 ID와 본인 user_id를 보내면 타인 게시물의 내용과 소유자를 덮어쓸 수 있다. 공통 upsert를 쓰는 다른 테이블도 영향 범위를 확인해야 한다.
- 증거: 실제 등록 함수와 모의 DB로 타인 ID에 대한 갱신 SQL 생성/200 응답 재현. 운영 DB 공격은 하지 않았다.
- 조치: 생성과 갱신을 분리하고, 갱신 WHERE에 기존 소유자를 강제한다. 소유권 컬럼은 upsert의 갱신 대상에서 제외한다.

### 2. [P1] 채팅방 ID만으로 본인 참여 행을 추가할 수 있음

- 위치: `api/server/routes/data.js:210`
- 원인: participants의 `row.user_id === userId`이면 방 생성자·초대 권한 검사 없이 true를 반환한다.
- 영향: 임의의 방에 가입한 뒤 membership 기반 조회를 통과할 수 있다. 같은 파일의 messages 갱신/삭제도 작성자 대신 방 참여 여부만 확인한다.
- 증거: 회원 자격 조회 없이 다른 방의 INSERT가 실행되는 경로 재현.
- 조치: 참여자 변경은 초대 권한을 검증하는 전용 채팅 API로 제한하고, 메시지 수정은 작성자에게 제한한다.

### 3. [P1] Cloudinary 삭제에 파일 소유자 검증 없음

- 위치: `api/server/routes/media.js:187`, `api/server/routes/media.js:217`, `api/server/routes/media.js:244`
- 원인: 로그인만 확인하고 요청의 publicId/URL로 서버 서명 삭제를 실행한다.
- 영향: Cloudinary 설정이 활성화되어 있으면 다른 사용자의 공개 사진/영상도 삭제 요청할 수 있다.
- 증거: fetch를 모의 처리해 타인 파일 ID가 destroy 요청에 전달되는 것을 재현했다. 실제 외부 요청은 없다.
- 조치: DB의 업로드 소유권을 검증하고, 레거시 파일도 소유권을 확인한 경우에만 삭제한다.

### 4. [P1] 이메일 인증/Wallet JWT가 세션 토큰으로 사용될 수 있음

- 위치: `api/server/index.js:957`, `api/server/middleware/requireAdmin.js:38`, `api/server/routes/auth.js:1439`, `api/server/routes/appleWallet.js:157`
- 원인: 여러 용도의 JWT가 같은 서명 키를 사용하지만 일반 인증은 서명과 sub만 검사한다. 관리자도 purpose/scope를 검사하지 않는다.
- 영향: 원래 제한된 용도의 유효 토큰 소지자가 그 주체의 일반 API 권한을 얻을 수 있다. 관리자 이메일을 가진 이메일 인증 토큰도 관리자 미들웨어를 통과한다.
- 증거: 격리된 테스트 키로 만든 `purpose=email_verify` 토큰이 관리자 미들웨어를 통과함을 재현. 실제 비밀키는 사용하지 않았다.
- 조치: 세션 전용 token type/audience를 발급·검증하고, 이메일·Wallet·계정연결 토큰을 일반 인증에서 거부한다.

### 5. [P1] 허용 이메일 관리자는 차단/삭제 여부를 조회하지 않음

- 위치: `api/server/middleware/requireAdmin.js:46`
- 원인: JWT 이메일이 관리자 allowlist에 있으면 DB 조회 전에 next() 한다.
- 영향: 계정 차단, 삭제, 이메일 변경 후에도 기존 토큰 유효기간 동안 관리자 접근이 유지될 수 있다.
- 증거: 차단된 사용자를 반환하도록 한 모의 DB가 한 번도 호출되지 않은 상태에서 인증 통과.
- 조치: 현재 DB 계정 상태와 현재 이메일을 먼저 확인하고 관리자 역할/allowlist를 평가한다.

### 6. [P1] 사용자 본인이 인증서 승인 상태를 저장할 수 있음

- 위치: `api/server/routes/data.js:98`, `api/server/routes/data.js:193`, `api/server/routes/data.js:264`
- 원인: certifications의 쓰기 컬럼에 status가 있고 일반 사용자에 대한 상태 값 제한이 없다.
- 영향: 제출자가 관리자 심사 없이 자신의 인증서를 approved로 저장할 수 있다.
- 증거: 본인 인증서 요청에 status=approved를 넣었을 때 저장 SQL/200 응답 재현.
- 조치: 사용자 생성 시 서버가 pending을 지정하고, 심사 상태 변경을 관리자 API로 한정한다.

### 7. [P1] DB에서 읽은 예약일이 Date이면 환불액이 0으로 계산됨

- 위치: `api/server/routes/resortPartners.js:36`, `api/server/routes/resortBookings.js:147`
- 원인: 환불 함수는 `String(bookingDate).slice(0,10)`이 YYYY-MM-DD라고 가정한다. 하지만 설치된 pg의 DATE 기본 파서는 Date 객체를 반환한다. 환불 요청은 SELECT *의 booking_date를 그대로 전달한다.
- 영향: 충분히 일찍 취소해도 날짜 계산이 NaN이 되어 마지막 규칙(0%)이 선택된다.
- 증거: pg DATE 파서가 Date를 반환하는 것과, 19일 전 100 USD 환불 계산이 0이 되는 것을 각각 확인했다. 기존 테스트는 문자열만 사용하여 모두 통과했다.
- 조치: SQL에서 예약일을 YYYY-MM-DD로 반환하거나 타입 정규화 후 계산한다. 유효하지 않은 날짜는 오류로 처리하고 Date 입력 회귀 테스트를 추가한다.

### 8. [P1] 기본 정원 날짜에서 동시 예약 정원 초과 가능

- 위치: `api/server/routes/resortBookings.js:85`, `api/server/routes/resortBookings.js:90`, `api/server/routes/resortBookings.js:93`
- 원인: profile은 FOR SHARE로 읽고, 일별 availability 행이 없으면 FOR UPDATE가 잠글 행도 없다. 서로 다른 요청이 같은 잔여 정원을 읽고 각각 INSERT할 수 있다.
- 영향: 정원 초과와 동일 사용자의 중복 예약이 가능하다. 활성 예약 인덱스는 UNIQUE가 아니다.
- 증거 수준: SQL/마이그레이션 정적 추적. PostgreSQL 동시성 통합 재현은 이번 점검에 포함하지 않았다.
- 조치: 리조트/날짜별 잠금 또는 항상 존재하는 inventory 행을 두고 생성·변경 경로 전체에 동일한 규칙을 적용한다.

### 9. [P1] 외부 예약 API는 정원·휴무일·예약 가능 기한을 검사하지 않음

- 위치: `api/server/routes/resortPartners.js:289`
- 원인: 외부 API의 생성 경로는 날짜 형식과 booking_enabled만 검사하고 INSERT한다. 앱 예약의 availability/정원/minNotice 검사와 분리되어 있다.
- 영향: 유효한 파트너 API 키로 휴무일, 과거 날짜, 정원 초과 예약이 등록될 수 있다.
- 조치: 앱과 외부 API가 같은 예약 생성 서비스를 호출하도록 통합한다. 중복 externalReference 경합은 UNIQUE 충돌 후 기존 결과를 반환한다.

### 10. [P2] 공개 profiles 응답은 모든 DB 컬럼을 반환함

- 위치: `api/server/routes/data.js:226`, `api/server/routes/data.js:228`
- 원인: DATA_TABLES.columns는 쓰기에만 사용되며 읽기는 SELECT *의 행을 그대로 반환한다. profiles는 비로그인 접근도 허용된다.
- 영향: license_number/license_image_url, 리조트 소유자·내부 수집 정보 등 공개 범위를 명시하지 않은 데이터가 응답에 포함된다. 앞으로 추가하는 컬럼도 자동 노출된다.
- 증거: 허용 목록에 없는 테스트 컬럼까지 비로그인 응답에 포함됨을 재현. 전화번호는 별도 마이그레이션에서 NULL 처리하고 있으므로 현재 전화번호 평문 유출로 단정하지 않는다.
- 조치: 공개용 SELECT 컬럼/직렬화 목록을 별도로 정의하고 비공개 라이선스 원본 접근 정책을 적용한다.

### 11. [P2] 10개 페이지 조회도 서버에서 전체 테이블을 읽음

- 위치: `api/server/routes/data.js:227`, `api/server/routes/data.js:234`, `app/src/lib/api.ts:2232`
- 원인: 필터·정렬·range·limit을 DB가 아닌 전체 행을 가져온 후 JS에서 처리한다. 미디어/좋아요/댓글은 전체 게시물 ID도 추가 조회한다.
- 영향: 데이터가 늘수록 피드 한 페이지와 검색이 전체 DB 크기에 비례해 느려지고 Node 메모리와 이벤트 루프 부하가 증가한다.
- 조치: 검증된 컬럼에 대한 매개변수 SQL WHERE/ORDER BY/LIMIT, 안정적인 커서 페이지네이션을 적용한다.

### 12. [P2] 앱의 리조트 검색은 최대 100+100개 내에서만 동작

- 위치: `app/src/lib/api.ts:2457`, `app/app/(tabs)/resorts.tsx:76`
- 원인: 일반 리조트 100개와 예약 가능 리조트 100개를 합치고 이후 페이지를 요청하지 않는다.
- 영향: 그 밖의 리조트는 앱에서 검색할 수 없다. 두 결과가 겹치므로 실제 표시 수는 200보다 적을 수 있다.
- 조치: 서버 검색과 페이지네이션을 연결한다.

### 13. [P2] 한국어 이외 사용자에게도 활동 알림 본문이 한국어로 발송됨

- 위치: `api/server/routes/data.js:295`, `api/server/lib/userNotificationDelivery.js:43`
- 원인: 좋아요·댓글·팔로우 본문이 한국어 리터럴로 저장되고 수신자 언어 변환 없이 발송된다.
- 영향: 앱 JSON 번역이 완전해도 영문/일문/중문 사용자의 푸시 및 저장된 알림에 한국어가 남는다.
- 조치: 수신자의 언어별 서버 알림 템플릿을 적용하고 기존 알림은 이벤트 타입 기반 표시를 검토한다.

## 추가로 확인된 미구현/검증 필요 범위

- Garmin/Suunto/Shearwater 연동: `api/server/routes/integrations.js:196` 이후 운영 환경은 `integration_sync_not_implemented`를 반환한다. 실제 외부 로그 동기화가 구현된 상태가 아니다.
- 예약금 paid/refunded는 관리자·파트너 API에서 수동 변경 가능한 상태이다. 상태 변경 성공을 PG 결제/환불 성공으로 해석하면 안 된다. 실제 PG 승인과 webhook 처리는 별도 통합 검증이 필요하다.
- 예약 timezone 설정은 조회되지만 예약 가능일/환불 날짜 계산에는 UTC를 사용한다. 지역 날짜 경계 테스트가 필요하다.
- DB TLS 설정에 `rejectUnauthorized:false`가 있다(`api/server/index.js:102`). 실제 DB 접속 경로와 CA 배포 상태를 확인한 뒤 인증서 검증을 활성화해야 한다.
- 앱의 로그아웃/계정 전환과 React Query 캐시 정리는 실제 기기에서 추가 확인이 필요하다.

## 실행 결과

| 검사 | 결과 |
|---|---|
| 루트 npm run check | 성공 |
| API 기존 단위 테스트 | 31/31 통과 |
| API 전체 JS 문법 검사 | 통과 |
| API 미정의 식별자 검사(Node 전역 반영) | 통과 |
| 앱 TypeScript | 통과 |
| 앱 ESLint | 오류 0 / 경고 1 |
| 웹 TypeScript | 통과 |
| 웹 ESLint | 오류 0 / 경고 22 |
| 관리자·웹 production build | 성공, 관리자 번들 크기 경고 |
| 격리 경로 프로브 | 8개 관찰 모두 재현(취약 경로 7개 + pg 타입 확인 1개) |
| ko/en/ja/zh 번역 JSON | 각각 1,051개 키, 누락 없음 |

비한국어 JSON의 한글은 `settingsPage.languages.ko`(한국어 자체 언어명) 한 곳이며 의도된 표기다. 키 개수 검사는 번역 의미의 정확성이나 서버에서 내려오는 본문 번역을 보장하지 않는다.

## 산출물과 재실행

- `tools/audit-20260905.mjs`: 실제 라우트 등록 함수 + 모의 DB/fetch를 이용하는 독립 점검 도구. 운영 서버에 연결하지 않는다. 취약성이 남아 있으면 reproduced=true이므로 일반 회귀 테스트의 통과 의미와 다르다.
- `artifacts/system-audit-20260905/file-inventory.json`: 파일별 경로·줄 수·해시·한글 포함 줄 수. 수동 검토 완료 표시가 아니다.
- `artifacts/system-audit-20260905/route-probes.json`: 격리 재현 결과.
- `artifacts/system-audit-20260905/locale-audit.json`: 언어별 키/한글 점검.
- `artifacts/system-audit-20260905/check.log`: 루트 검사 로그.

재실행: 저장소 루트에서 `node tools/audit-20260905.mjs`, `npm run check`, API 폴더에서 `npm test`.

수정 우선순위: 데이터/채팅/미디어 권한과 JWT 분리 → 인증서 승인 보호 → 환불 계산·예약 정원 공통 처리 → 공개 응답·DB 페이지네이션 → 앱 리조트 검색·서버 알림 다국어.

이번 결과는 로컬 정적·격리 검증 보고서이며 모든 화면/기기/실서비스 조합의 무결성을 보증하지 않는다. 네이티브 iOS/Android 실행, 실 PG sandbox, 실제 DB 동시성, 모든 소스 줄의 수동 검토는 미완료 범위다.
