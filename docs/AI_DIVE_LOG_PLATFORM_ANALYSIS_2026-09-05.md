# Divergram AI Dive Log Platform: 현황과 단계적 확장 계획

분석일: 2026-09-05 KST

상태: **설계 검토용. 구현, DB 변경, 배포, 유료 AI 호출은 수행하지 않음.**

## 결론

기존 앱을 다시 만들 필요는 없다. 인증, 게시물, 사진 업로드, 편집 UI, 기기 관리 UI, 다국어 기반, 작업 큐를 유지하고 확장한다. 다만 **화면이 존재하는 것과 실제 로그의 영구 저장·기기 동기화가 완성된 것은 다르다.** 현재 AI Dive Log 목표의 기반에는 다음 보완이 선행되어야 한다.

1. 서버 게시물 기반 로그와 메모리 기반 가져온 로그를 하나의 영구 저장 계약으로 연결한다.
2. 원본 수치, 사용자 수정값, AI 후보값을 분리한다. 누락값에 오늘 날짜나 샘플 수치를 넣지 않는다.
3. AI 생성은 저장의 필수 조건이 아닌 선택적 초안 단계로 옮긴다. 실패해도 일반 로그는 저장된다.
4. 제조사 API/BLE, 과거 환경, 이미지 AI는 인터페이스 존재만으로 지원 완료라고 표시하지 않는다.
5. DB/API는 추가형으로 확장하고 기존 앱 1.2.9, 피드·댓글·좋아요·공유 링크를 유지한다.

사용자의 “90% 개발”은 프로젝트 전체에 대한 설명이다. 이 보고서는 이를 로그 자동화 파이프라인의 90% 완성으로 환산하지 않는다.

## 분석 범위와 증거 수준

분석 기준은 현재 작업 디렉토리 `/Users/kimseokgeun/Desktop/Works/divergram`이다. 수정 중인 파일과 미추적 파일도 포함했다. Git HEAD만의 분석이 아니며, 현재 스토어 바이너리나 운영 서버와 모든 파일이 동일하다고 가정하지 않았다.

| 조사 범위 | 파일 수 | 줄 수 |
| --- | ---: | ---: |
| app/app | 70 | 13,325 |
| app/src | 157 | 31,526 |
| api/server | 67 | 12,154 |
| api/db/migrations | 45 | 3,974 |
| adm/src | 44 | 11,316 |
| web/src | 51 | 12,549 |
| 합계 | 434 | 84,844 |

집계 확장자: ts, tsx, js, jsx, sql, json, css. 빈 줄·번역 JSON·테스트 포함. 패키지 설정과 관련 iOS/Android 네이티브 설정도 별도 확인했다. 전체 트리를 인벤토리·키워드 검색했고, 로그 생성부터 API·저장·업로드·AI·기기·환경까지 관련 호출 경로를 집중 독해했다. **434개 파일의 모든 줄을 수동 검증하거나 전체 기능을 E2E 테스트했다는 의미는 아니다.**

- DB 상태는 코드의 생성 DDL, migrations, API 필드 허용 목록 기준이다. 이번에는 운영 DB의 실제 스키마·레코드를 조회하지 않았다.
- 재현은 외부 로그 mapper를 TypeScript 메모리 변환 후 합성 데이터로 호출한 로컬 실험이다. 실제 사용자 데이터나 기기에는 접근하지 않았다.
- 실제 BLE 로그 다운로드, 제조사 승인 계정, 이미지 인식, 유료 기상 API, 앱 UI 실기기 테스트는 이번 분석에서 실행하지 않았다.
- 공식 외부 자료는 연동 가능성 조사에만 사용했다. Divergram 계정의 계약·권한·요금제 보유를 증명하지 않는다.
- 아래 신규 파일 및 DB/API 이름은 모두 **제안**이다. 경로는 위 프로젝트 루트 기준이며 실제 근거 링크는 절대 경로로 제공한다.

---

## STEP 1. 현재 프로젝트 구조

### 기술 스택

| 계층 | 현재 코드 기준 | 판단 |
| --- | --- | --- |
| Mobile | React Native 0.85.3, React 19.2.3, Expo ~56.0.12, Expo Router, TypeScript | 기존 라우트와 네이티브 프로젝트 유지 |
| UI/상태 | NativeWind, Tailwind, Zustand, React Query, i18next | 기존 테마·컴포넌트 재사용 |
| 로컬 저장 | MMKV, SecureStore; expo-sqlite 의존성 존재 | 의존성 존재가 로그 SQLite 저장 구현을 뜻하지 않음 |
| BLE/사진/위치 | react-native-ble-plx, expo-image-picker, expo-location | 권한·검색·선택 기반 재사용 |
| Backend | Node.js ESM, Express 5, pg, JWT, bcryptjs | 별도 마이크로서비스보다 기존 API 안의 모듈 확장 우선 |
| DB | PostgreSQL, SQL 직접 실행, JSONB app_records | ORM 신규 도입 없이 추가형 SQL migration |
| Admin | React 18, Vite 5, JSX, Recharts | 기존 운영 메뉴·권한·페이지네이션 확장 |
| Web | React 18, Vite 5, TypeScript | 기존 게시물 계약의 호환 소비자 |
| AI | 서버 OpenAI Responses HTTP 호출; 텍스트 응답 | 이미지·음성·구조화 로그 파이프라인은 없음 |
| Media | Cloudinary 서명 업로드, 조건부 unsigned fallback, API 파일 업로드 fallback | 안정적 asset ID·소유권·비공개 전달 보완 필요 |
| Jobs | PostgreSQL app_jobs + Node queue-worker | 현재 메시지·관리자 푸시 작업용. AI 큐로 그대로 연결하면 안 됨 |

근거: [app/package.json](/Users/kimseokgeun/Desktop/Works/divergram/app/package.json), [api/package.json](/Users/kimseokgeun/Desktop/Works/divergram/api/package.json), [adm/package.json](/Users/kimseokgeun/Desktop/Works/divergram/adm/package.json), [web/package.json](/Users/kimseokgeun/Desktop/Works/divergram/web/package.json).

### 디렉토리와 책임

```text
divergram/
  app/
    app/(auth)/                  로그인·가입 라우트
    app/(tabs)/logs.tsx           피드형 작성/편집 진입점
    app/(tabs)/dive-log-*.tsx     가져온 로그 관리/상세/편집 라우트
    src/models/                  DiveLog, ExternalDiveLog, MediaFile, MarineWeather
    src/screens/dive-log/        기기, 편집, AI 설정, 해양 정보 화면
    src/services/                API 연동, mapper, BLE, AI, media, weather
    src/stores/                  Zustand 상태; 로그와 설정의 저장 방식은 서로 다름
    src/providers/               AuthProvider
    src/lib/                     API facade, storage, i18n, 권한·지도 유틸
    src/components/              공통 UI
    src/features/devices/        기기 카드·차트
    src/locales/                 ko/en/ja/zh.json
    ios/ android/                실제 네이티브 타깃
  api/
    server/index.js              서버 구성, DB 초기화 DDL, route 등록
    server/routes/               data, drafts, integrations, AI, media, admin 등
    server/lib/                  암호화, 세션, SQL 필터, 알림 등
    server/queue-worker.js       비동기 메시지/푸시 처리
    db/migrations/              SQL 이력; 옛 posts와 현재 app_posts 구분 필요
  adm/src/sections/              운영 UI; LogsSection은 다이빙 로그 아닌 감사 로그
  web/src/components/           피드와 웹 작성/편집 등
  web/src/utils/exifGps.ts      JPEG EXIF GPS·날짜 parser
  docs/                         설계·검증·릴리스 문서
  tools/ scripts/               개발·진단·운영 보조 도구
  deploy/ api/deploy/           배포 설정
```

### 인증 및 접근 경계

- 앱은 Bearer 세션을 API에 전달한다. 네이티브 토큰 저장은 SecureStore 기반이다.
- 서버는 JWT 세션 검증, bcrypt 비밀번호 확인, SNS 인증 경로를 가진다. 새 로그 기능 때문에 인증 체계를 교체하지 않는다.
- app_users.id는 BIGINT, app_profiles.id·app_posts.user_id는 TEXT다. 신규 FK 타입을 임의로 섞지 않는다.
- 새 로그 API의 소유자는 요청 body의 userId가 아니라 검증된 세션에서 결정한다.
- 현재 data API의 게시물 조회는 피드용이다. 비공개 로그·원본·음성·기기 일련번호를 이 공개 투영에 추가하지 않는다.
- 관리자도 원본과 음성을 기본 조회하지 않으며, 별도 권한·감사 기록을 요구하도록 설계한다.

근거: [AuthProvider](/Users/kimseokgeun/Desktop/Works/divergram/app/src/providers/AuthProvider.tsx:344), [secureAuthStorage](/Users/kimseokgeun/Desktop/Works/divergram/app/src/lib/secureAuthStorage.ts:1), [sessionToken](/Users/kimseokgeun/Desktop/Works/divergram/api/server/lib/sessionToken.js:1), [data route](/Users/kimseokgeun/Desktop/Works/divergram/api/server/routes/data.js:91).

## STEP 2. 이미 구현된 기능과 완성도

“구현”은 소스 경로 확인을 의미하며 이번 실기기 검증 완료를 의미하지 않는다.

| 기능 | 현 상태 | 구분 |
| --- | --- | --- |
| 스쿠버/프리/일상 작성 | 제목·미디어·내용·수치·위치·SNS 배포 선택 | 서버 저장 경로 존재 |
| 피드/릴스·댓글·좋아요 | app_posts 등 기존 계약 | 유지 대상 |
| 로그 작성 사진/영상 업로드 | Cloudinary와 서버 fallback | 구현됨 |
| EXIF GPS | 모바일 두 화면에서 GPS 추출·위치 반영 | 부분 구현 |
| 웹 EXIF 날짜 | JPEG 날짜와 GPS 추출 | 부분 구현; 시각·timezone 미보존 |
| 가져온 DiveLog 관리/상세/편집 | 별도 모델, media 순서·대표 이미지, 공개 범위 UI | UI 존재; 영구 저장 연결 불완전 |
| 편집 초안 복구 | local storage + app_records 서버 초안 PUT/GET/DELETE | 구현됨; 최종 로그 저장과 다름 |
| AI 요약/캡션 | 텍스트 프롬프트 → 서버 → 텍스트 반환 | 구현됨; 한국어 고정·fallback |
| AI 설정 | 사용자별 summary/caption/risk 등의 토글 | 구현됨; 비용·서버 정책 아님 |
| BLE 권한·스캔·연결 | native manager + 진단·등록 UI | 실제 통신 기반 존재 |
| 제조사 로그 다운로드 | adapter·service 이름은 존재 | 운영 cloud 501, BLE parser 미완성 |
| 수동 가져오기 | 개발용 샘플 2개 | 실제 파일 import 아님 |
| 해양 정보 | Stormglass point 조회·로컬 cache·자체 점수 | 현재/예보 중심, 과거 로그 연결 아님 |
| 개인 통계 | 게시물 client 합산 + ProfileStats UI | 일부 구현; 다이빙 정의 보완 필요 |
| 음성/STT·이미지 생물 분석·도감 | 관련 구현 미발견 | 신규 모듈 |
| 자연어 검색·통합 AI Draft | 관련 구현 미발견 | 신규 모듈 |
| 자동 동기화 | 설정값과 UI 존재 | Dive 종료 이벤트/백그라운드 동기화 실행 경로는 확인되지 않음 |

## STEP 3. 재사용할 부분

| 기존 파일/모듈 | 재사용 내용 | 그대로 재사용하면 안 되는 부분 |
| --- | --- | --- |
| src/components/{Screen,Card,Button,Toast,PermissionGate}.tsx | 화면·버튼·상태·권한 디자인 | 새로운 화면만 별도 색상/폰트 체계로 만들지 않음 |
| DiveLogEditScreen.tsx | 미디어 큐, 재시도, 정렬, 미저장 경고, 초안 복구 UX | onSave의 메모리-only 저장, 삭제 순서, 고정 한국어 |
| cloudinaryService.ts / media.js | 서명 업로드·인증·fallback | URL만 식별자로 사용, 원본/음성의 공개 URL 배포 |
| externalDiveLogMapper.ts | 외부→내부 변환 분리 지점 | 단위 추측, 임의 날짜/ID, rawPayload 유실 |
| DiveComputerAdapter / nativeBleDiveService | provider 경계, native scan/connect | cloud 결과를 bluetooth 원본으로 재라벨링 |
| diveLogDrafts.js | 사용자별 초안 key·인증 | 완성 로그 DB로 간주하거나 모든 필드를 무검증 수용 |
| translations.js | 서버 AI proxy, hash cache 아이디어 | 번역 cache 테이블을 이미지/음성 cache로 혼용 |
| app_jobs / queue-worker | SKIP LOCKED claim 패턴 | unknown type 완료 처리, 긴 AI 작업 lease 부재 |
| ProfileStats, DiveDataChart | 통계 카드·차트 라이브러리 | 현재 차트의 마지막 6개 샘플·고정 5초 label |
| i18n + locales | 4개 언어 및 비한국어의 영어 fallback | 화면 직접 한국어/AI 한국어 prompt는 자동 번역되지 않음 |
| adm OperationalModuleSection | 운영 모듈 공통 표시 | 현재 app_posts 최대 300행을 전체 DiveLog로 오인 |

근거: [편집 저장](/Users/kimseokgeun/Desktop/Works/divergram/app/src/screens/dive-log/DiveLogEditScreen.tsx:823), [공통 Button](/Users/kimseokgeun/Desktop/Works/divergram/app/src/components/Button.tsx:1), [차트](/Users/kimseokgeun/Desktop/Works/divergram/app/src/features/devices/DiveDataChart.tsx:25), [worker](/Users/kimseokgeun/Desktop/Works/divergram/api/server/queue-worker.js:35), [번역 cache](/Users/kimseokgeun/Desktop/Works/divergram/api/server/routes/translations.js:12).

## STEP 4. 현재 Dive Log 작성 흐름

### A. 실제 서버 게시물 작성 경로

```text
logs.tsx
  → 스쿠버/프리/일상 선택
  → 제목·포인트·깊이·시간·수온·시야·버디·내용 입력
  → 이미지 선택(EXIF GPS 일부 반영)
  → Cloudinary 또는 API 업로드
  → apiClient.createLog
  → dataApi.insert('posts') → app_posts
  → dataApi.insert('post_media') → app_post_media
  → 피드/릴스 query 갱신 → 설정한 외부 SNS 공유
```

이 경로는 입력 중심이다. 날짜 필드가 DB에는 있으나 모바일 createLog payload에는 dive_date가 없다. 제목과 내용은 caption에 합쳐 저장한다. 현재 폼에는 최소 하나의 게시 대상이 필요해 “비공개 다이브만 저장”과 분리가 필요하다. posts와 media는 별도 HTTP 저장이므로 원자적 확정 계약도 보완해야 한다.

근거: [LogsScreen](/Users/kimseokgeun/Desktop/Works/divergram/app/app/(tabs)/logs.tsx:145), [createLog](/Users/kimseokgeun/Desktop/Works/divergram/app/src/lib/api.ts:2656).

### B. 가져온 로그 경로

```text
BluetoothDeviceScreen
  → provider/BLE sync service
  → ExternalDiveLog → DiveLog
  → useDiveLogStore.appendImportedLogs (메모리)
  → DiveLogManagement → Detail → Edit
  → 편집 중 local/server draft 저장
  → 저장 시 AI summary/caption 생성
  → useDiveLogStore.updateDiveLog (메모리)
  → local/server draft 삭제
```

이 흐름에는 정규 로그를 서버에 확정하는 호출이 없다. 따라서 앱 프로세스 종료 후 저장 내용 소실 위험이 있다. 서버 draft는 편집 중 백업이지 영구 로그가 아니며, 저장 완료 때 삭제된다. 로그가 store에 없으면 updateDiveLog는 새 항목도 만들지 않는다. 실패한 draft 삭제가 저장 오류로 표시될 가능성도 있다.

근거: [store](/Users/kimseokgeun/Desktop/Works/divergram/app/src/stores/diveLogStore.ts:64), [onSave](/Users/kimseokgeun/Desktop/Works/divergram/app/src/screens/dive-log/DiveLogEditScreen.tsx:895), [draft routes](/Users/kimseokgeun/Desktop/Works/divergram/api/server/routes/diveLogDrafts.js:16).

### C. 별도 GPS 트래킹

DiveMode는 foreground GPS를 수집하지만 종료 시 SQLite/API 저장은 TODO다. apiClient.uploadTrack도 not_implemented다. 스마트폰 GPS 추적을 수중 실제 이동 경로나 수심 측정으로 해석하면 안 된다.

근거: [DiveMode 종료](/Users/kimseokgeun/Desktop/Works/divergram/app/src/features/dive/DiveMode.tsx:105), [uploadTrack](/Users/kimseokgeun/Desktop/Works/divergram/app/src/lib/api.ts:2726).

## STEP 5. 현재 DB / Data Model

| 현재 저장소 | 주요 내용 | 한계 |
| --- | --- | --- |
| app_posts | user_id, caption, dive_type/date, max_depth, duration, temperature, site, GPS, visibility, gas, buddy, publish flags | 로그와 게시물 결합; 원본/출처/버전/기기/세부 profile 부재 |
| app_post_media | post_id, URL, type, order | asset hash, EXIF, 원본 촬영시각, 소유자·분석 결과 부재 |
| app_records / dive_log_drafts | userId:logId JSON 초안 | 500KB 상한; final logs 목록·검색·통계 계약 아님 |
| app_records / external_integrations | 제조사별 연결 상태·암호화 credentials | 실제 토큰 교환/로그 fetch 구현과는 별개 |
| app_records / ai_settings | summary/caption/risk 토글 | task별 모델, 비용, 동의 증빙 없음 |
| app_jobs | type,payload,status,attempts,last_error | 현재 push/chat 처리용 |
| app_translation_cache | 텍스트 hash·언어·번역 결과 | 이미지 cache 아님 |
| DiveLog TS | 기본 수치·graph·media·weather·sourceType·AI 문자열 | 필드별 provenance, 원본 파일, timezone, diveType, 확정 revision 없음 |
| ExternalDiveLog TS | 단위 접미사 있는 수치, rawPayload | DiveLog 변환 시 rawPayload 미전달 |
| MediaFile TS | URI/URL·size·duration·upload status | capture time·GPS·camera·orientation·hash 없음 |
| MarineWeather TS | 일부 환경값·전체 source·risk·observedAt | 필드별 provider/시간/품질 구분 부족; SST와 수중 수온 혼동 가능 |

근거: [app_posts DDL](/Users/kimseokgeun/Desktop/Works/divergram/api/server/index.js:574), [app_records DDL](/Users/kimseokgeun/Desktop/Works/divergram/api/server/index.js:308), [DiveLog](/Users/kimseokgeun/Desktop/Works/divergram/app/src/models/DiveLog.ts:1), [ExternalDiveLog](/Users/kimseokgeun/Desktop/Works/divergram/app/src/models/ExternalDiveLog.ts:1), [MediaFile](/Users/kimseokgeun/Desktop/Works/divergram/app/src/models/MediaFile.ts:1).

참고: migrations 안의 초기 Supabase 스타일 posts/RLS SQL과 현재 Express의 app_posts DDL을 동일한 스키마라고 보면 안 된다. 마이그레이션 전 운영 information_schema·인덱스·제약조건 조회가 필수다. 새 민감 테이블을 generic data API 허용 목록에 자동 등록하지 않는다.

## STEP 6. Gap Analysis 및 우선 위험

### 확인한 주요 문제

| 우선 | 문제 | 소스 증거 / 영향 |
| --- | --- | --- |
| P0 | 가져온 로그 최종 저장이 메모리-only | store:64, editor:900. 저장 성공 문구 후 프로세스 종료 시 소실 위험 |
| P0 | 기상 fallback에 샘플 수치 혼합 | stormglassService:519에서 sample spread, :611에서 mock visibility. 실측 사실로 사용 금지 |
| P0 | cloud 데이터를 BLE 원본으로 표시 | diveComputerAdapter:85의 toBluetoothLogs. transport와 실제 측정 출처 분리 필요 |
| P0 | 원본/사용자/AI를 구분하는 DB 사실 계층 없음 | 측정 신뢰도 요구를 현재 문자열 sourceType만으로 만족 불가 |
| P1 | duration 단위 크기로 추측 | externalDiveLogMapper:51. 초/분 명세와 schema version 필수 |
| P1 | 누락 날짜는 오늘, 누락 ID는 Date.now | 외부 로그 날짜 오염·중복 미탐 가능 |
| P1 | timezone 손실 | UTC date와 local HH:mm 혼합. 자정·해외 다이빙 사진 매칭 오류 |
| P1 | nested GPS/heartRate 누락 | mapper는 평면 필드만 읽음. 표준 모델과 불일치 |
| P1 | rawPayload 전송 유실 | convertExternalToDiveLog에서 보존하지 않음 |
| P1 | 중복 비교가 현재 목록+source/externalID뿐 | 재설치·재가져오기·cloud/BLE 교차 중복에 취약; DB unique 필요 |
| P1 | 사진 분석·최종 초안 cache 없음 | 저장 때 summary와 caption 최대 2회, 변경 없는 내용도 재생성 |
| P1 | AI prompt 및 편집 UI 한국어 고정 | locale JSON 기반 화면과 달리 타언어 모드에서도 한국어 출력 가능 |
| P1 | 제조사 운영 sync 미구현 | integrations.js:190 부근 운영 환경 501; API 토큰 refresh도 provider HTTP 갱신 아님 |
| P1 | 개인 통계가 게시물 수를 dives로 간주 | api.ts:1403; 다른 경로의 dive_type truthy 조건은 daily도 포함 가능 |
| P1 | 비공개 원본 전달 경계 없음 | media.js:112 GET 파일 공개; 기존 업로드를 음성·원본에 바로 사용하지 않음 |
| P2 | 로그 관리 ScrollView 전체 렌더, 동기화 limit 100 | 수천 건 import/검색 UX에 부적합 |
| P2 | local 초안 key에 userId 없음 | draftStorageKey는 logId 기반. 계정 전환 시 캐시 분리/정리 필요 |
| P2 | graph t 단위가 불명확 | 차트는 실제 timestamp 대신 고정 index label. 프로파일 렌더 수정 필요 |

이 우선순위는 새 AI 플랫폼의 데이터 무결성 기준이다. 실제 피해 발생 건수를 주장하는 것은 아니다. 안전 관련 기존 점수·diveAllowed는 검증된 다이빙 판정 엔진이라는 근거가 없으므로, 새 파이프라인에서 안전 승인으로 소비하지 않는다. 기존 UI 변경은 별도 영향 검토 후 시행한다.

### 수정 없이 실행한 재현

externalDiveLogMapper.ts를 메모리에서 transpile해 합성 입력으로 실행했다.

| 입력 | 실제 결과 | 의미 |
| --- | --- | --- |
| duration:2700, 단위 없음 | totalDiveTimeMin:2700 | 초를 뜻하는 payload라면 45분이 2700분으로 오해됨. 명세 없는 자동 추측 금지 |
| id만 있고 날짜 없음 | diveDate:2026-09-05 | 원본이 없는 날짜를 생성 |
| gpsLocation:{lat:33.2,lng:126.5}, heartRate:{avg:110} | 두 필드 undefined | nested 정상화 경로 부재 |
| startTime:2026-09-05T00:30:00+09:00 | diveDate:2026-09-04, entryTime:00:30 | UTC 날짜와 로컬 시각 혼합 |

근거: [mapper](/Users/kimseokgeun/Desktop/Works/divergram/app/src/services/externalDiveLogMapper.ts:19), [변환](/Users/kimseokgeun/Desktop/Works/divergram/app/src/services/diveLogSyncService.ts:24), [weather](/Users/kimseokgeun/Desktop/Works/divergram/app/src/services/stormglassService.ts:519), [adapter](/Users/kimseokgeun/Desktop/Works/divergram/app/src/services/diveComputerAdapter.ts:85).

### 요구사항 전체 대응

| 요구 | 현재 대비 필요한 추가 |
| --- | --- |
| A Dive Computer | 실제 provider adapter + raw 보존 + capability registry |
| B Photo | 기존 upload에 asset metadata·hash 추가 |
| C Photo AI | task worker·구조화 분석·cache·확정 flow 신규 |
| D GPS/EXIF | 공통 parser, capture timezone, camera offset, 매칭 제안 |
| E Weather/Marine | 서버 historical query·필드별 provenance·snapshot |
| F Voice | 녹음 권한·STT·원문·구조화 후보·삭제 정책 |
| G Text | 기존 memo 재사용, 원문 보존 및 후보 추출 |
| H Manual | 기존 폼 재사용, 수정 이력·source=USER |
| Generator/Copilot | typed draft·Accept/Edit/Ignore·revision 충돌 방지 |
| Import | 파일 wizard, parser, exact/fuzzy dedup, preview, resume |
| Collection | observation 기반 사용자별 확정 도감 |
| Search/Stats/Insights | SQL 조건·집계, 제한된 자연어 해석, 안전 판정 금지 |
| 비용/출처 | model config·사용량·예산·idempotency·필드 provenance |

## STEP 7. 추가형 DB Schema 제안

### 설계 결정

**app_posts를 대체하지 않고, 독립 app_dive_logs를 추가하는 방안을 권장한다.** posts에 JSONB 하나만 더하는 방안은 처음에는 작지만, 비공개 로그·센서 프로파일·수천 건 import·revision·필드 통계를 모두 게시물 계약에 묶는다. 별도 저장소와 호환 adapter가 장기 위험이 낮다. 아래는 migration 승인 전 제안이며 SQL 실행은 하지 않는다.

### MVP 핵심 테이블

| 테이블 | 주요 컬럼(제안) | 제약 / 인덱스 |
| --- | --- | --- |
| app_dive_logs | id TEXT(UUID 문자열), user_id TEXT, dive_type, status, local_date DATE nullable, started_at/ended_at TIMESTAMPTZ nullable, timezone_name, utc_offset_minutes, time_precision, duration_seconds, max_depth_m, avg_depth_m, measured_water_temp_c, site_id/name, country_code, lat/lng, memo, narrative, visibility, revision, created/updated/deleted_at | CHECK 수치·좌표·종료>=시작; user/date/id keyset; 출처 미확정은 nullable. 확정 수치만 통계 projection에 반영 |
| app_dive_sources | id, dive_log_id, user_id, source_kind, acquisition_method, provider, device_identity_hmac, external_log_id, raw_asset_id 또는 raw_json, sha256, original_units, parser_version, imported_at, attestation_level | 불변 원본; 소유자 일치 FK; user/provider/device/externalID unique(값이 있을 때) |
| app_dive_facts | id, dive_log_id, field_path, value_json, unit, source_id, source_kind, confidence nullable, quality, user_confirmed, confirmed_by/at, supersedes_fact_id, evidence_refs, created_at | source_kind CHECK; model 후보와 원본 fact는 별도 행. confidence 범위 0..1 또는 null |
| app_dive_revisions | dive_log_id, revision, selected_fact_ids, user_patch, narrative, actor_id, created_at | unique(log,revision), 원본 소거 없이 선택 이력 |
| app_dive_post_links | dive_log_id, post_id, relation, published_revision | 기존 post id/좋아요/댓글/URL 유지. 초기 one-log-one-primary-post unique |

user_id는 현 API와 호환되는 TEXT canonical ID로 시작하고 app_profiles(id)와 연결하는 안이다. 실제 app_users/app_profiles 매칭과 계정 삭제 정책을 운영 스키마에서 확인한 뒤 FK를 확정한다. API 세션의 존재·차단 상태 검증도 병행한다.

기존 app_records/dive_log_drafts는 초기 호환 저장소로 유지한다. schemaVersion/baseRevision 추가와 검증을 먼저 적용하고, 별도 draft 테이블 전환은 이용량을 본 뒤 결정한다. 원본 프로파일 전체를 500KB draft에 넣지 않고 source 참조만 저장한다.

### 후속 Phase 테이블

| 테이블 | 목적·주요 제약 |
| --- | --- |
| app_dive_assets | owner, storage_provider/key/version, original_sha256, mime,size, capture_time_raw/UTC/timezone, GPS accuracy, orientation,camera, privacy, deletion state; 원본 EXIF private |
| app_dive_media_links | log_id,asset_id,order,match_reason,user_confirmed; 한 원본을 여러 로그에 연결 가능, unique(log,asset) |
| app_dive_ai_runs | owner,task,status,input_hash,base_revision,model/provider/config/prompt/schema versions, consent receipt, usage,cost_usd,result,error; 중복 작업 key unique |
| app_dive_image_analyses | owner,asset_hash,task/model/prompt/schema versions,result,status; same-user unique cache, evidence와 확인 결과 분리 |
| app_dive_environment | log/source refs, query coordinates/time window, provider/model, returned_at, valid_time, values/units/quality, raw snapshot; SST와 실측 수온 별개 |
| app_dive_import_jobs / app_dive_import_items | 파일 hash/parser/version/options, 진행률, row result, validation errors, dedup decision, committed log ID; job/item unique |
| app_marine_observations | user,log,asset,evidence,proposed taxon/common label, confidence,status,confirmed_by/at; AI candidate와 accepted/rejected 분리 |
| app_marine_taxa | 검증된 taxonomy 식별자·이름·버전(선택); AI가 만든 종명을 곧바로 taxonomy master에 등록하지 않음 |

depthProfile는 MVP에서 source별 압축 원본/JSON profile 참조로 보관한다. raw sample이 커질 때 `app_dive_samples(source_id, sample_index, elapsed_seconds, depth_m, temperature_c, ...)`를 별도 도입한다. 처음부터 전체 JSON/배열을 목록 API나 AI prompt로 반환하지 않는다.

### 출처와 수정 규칙

```json
{
  "field": "maxDepthM",
  "effectiveFactId": "fact-device-1",
  "facts": [
    { "id": "fact-device-1", "value": 28.4, "unit": "m", "source": "DIVE_COMPUTER", "sourceId": "source-1", "confidence": null },
    { "id": "fact-user-2", "value": 27.9, "unit": "m", "source": "USER", "userConfirmed": true, "supersedesFactId": "fact-device-1" }
  ],
  "conflict": true
}
```

- 위 값은 구조 설명용 가상 예시다. confidence=null은 정확도가 0이라는 뜻이 아니라 확률을 부여하지 않는다는 뜻이다.
- 자동 초안의 기본 우선순위: 컴퓨터 원본 > 사용자 확정 > 원본 EXIF/GPS > 외부 환경 > AI 추정.
- 사용자는 컴퓨터 수치도 “표시값 수정”을 할 수 있다. 원본 28.4는 그대로 두고 명시적 확인 후 effectiveFactId를 사용자 fact로 변경한다. 수정값은 컴퓨터 측정이라고 표시하지 않는다.
- 전송 방법 IMPORT/BLE/API와 실제 origin DIVE_COMPUTER/USER/UNKNOWN은 서로 다른 필드다. 파일을 업로드했다고 자동으로 신뢰 가능한 제조사 측정으로 승격하지 않는다.
- 일반 클라이언트가 source=DIVE_COMPUTER나 provider 신뢰 수준을 임의로 지정할 수 없다. 서버 parser·서명/원본 검증 가능한 범위에서만 설정한다. 파일 변조 여부를 검증 못하면 attestation=unverified_import.
- AI가 깊이·시간·수온·위치를 제안하더라도 실측 칼럼에 쓰지 않는다. AI 이미지의 시야는 기본 정성 설명; 숫자가 필요하면 unsupported/추정으로 별도 보관한다.
- 알고리즘으로 평균이나 ascent를 계산하면 DERIVED, 입력 source ID와 알고리즘 버전을 기록한다. 컴퓨터 원본 average/ascent와 구별한다.
- GPS 없는 사진의 시각 매칭은 사진 GPS를 만들어내지 않는다. 연결 후보의 source=DERIVED이며 evidence는 capture time과 dive interval이다.

## STEP 8. Backend API 변경안

공통 prefix는 기존 `/api` 유지. 기존 `/api/data/posts`, `/api/ai/generate`, `/api/dive-log-drafts`는 당장 제거하지 않는다. 아래 엔드포인트는 신규 제안이다.

| API | 역할 | 핵심 계약 |
| --- | --- | --- |
| POST /api/dive-logs | 비공개 수동 초안/로그 생성 | 세션 owner, idempotency key, AI 불필요 |
| GET /api/dive-logs | 내 로그 목록/필터 | 기본 20, 최대 100, opaque cursor; raw 제외 |
| GET /api/dive-logs/:id | 요약·선택 facts·revision | owner/공유 정책; profile 별도 pagination |
| PATCH /api/dive-logs/:id | 사용자 수정 | If-Match/baseRevision; 충돌 409; 원본 수정 불가 |
| POST /api/dive-logs/:id/confirm | 초안 확정 | facts 선택·후보 승인, 원자적 저장; AI 장애와 무관 |
| POST /api/dive-logs/:id/publish | 기존 피드로 발행 | app_posts/media/link transaction, 반복 요청 중복 방지 |
| DELETE /api/dive-logs/:id | 삭제 요청 | 연결 post 처리 선택, source/media 참조·privacy 고려 |
| POST /api/dive-assets/init, /:id/complete | 원본 등록·완료 검증 | 실제 저장 object·hash·크기·MIME·owner 검증 |
| GET /api/dive-assets/:id/content | 비공개 다운로드 | 단기 signed URL 또는 인증 stream |
| POST /api/dive-logs/:id/media-matches | 사진 후보 매칭 | deterministic, unknown timezone은 사용자 선택 |
| POST /api/dive-assets/:id/analyze | 이미지 AI 작업 | consent·예산·cache 검증, 202 + job ID |
| POST /api/dive-logs/:id/ai-drafts | 통합 초안 생성 | 서버가 검증된 증거만 조립; input hash/baseRevision |
| GET /api/dive-ai-runs/:id | 진행/결과 | owner만, pending/running/succeeded/failed/canceled |
| PATCH /api/dive-logs/:id/suggestions/:suggestionId | Accept/Edit/Ignore | revision+suggestionId idempotent; 원본 사실 불변 |
| POST /api/dive-logs/:id/voice-memos | 음성/STT job | 크기·길이·MIME·동의·삭제 정책 |
| POST /api/dive-logs/:id/environment | 과거 환경 조회 job | 확정 위치/시각, provider coverage 밖이면 unavailable |
| POST /api/dive-imports, /:id/preview, /:id/commit | 파일 분석/미리보기/확정 | parserVersion·hash·rows·중복 decision 일치 |
| GET /api/dive-imports/:id | 부분 성공·진행률 | resume cursor·행별 오류 |
| POST /api/dive-computers/:provider/sync | 실제 지원 provider 수집 | unsupported/configuration_required 명확히 반환 |
| GET /api/marine-collection | 내 확인된 생물 도감 | 후보 보기 별도, 고유 dive 기준 집계 |
| POST /api/dive-search/interpret | 자연어→typed filter | SQL 문자열 수용 금지, 해석 조건 사용자 표시 |
| GET /api/dive-statistics | 개인 통계 | SQL aggregate, confirmed dives, null 제외 |
| GET /api/admin/dive-ai-usage | 비용·실패·cache hit 운영 | 개인 원문 없이 집계, 관리자 권한 |

추가 요구: JSON schema validation, request ID, 합리적인 rate limit, DB transaction, worker timeout, 감사 이벤트, 삭제 전후 cache 무효화. 외부 SNS는 DB commit 이후 기존 서비스가 수행하되 실패가 원본 로그 저장을 취소하지 않게 분리한다.

## STEP 9. Mobile App 및 인터페이스 아키텍처

### 현재 메뉴를 유지하는 확장

```text
전체 메뉴
  로그 작성 (기존 logs.tsx)
    스쿠버 / 프리 / 일상
    스쿠버·프리만 AI 보조 작성 진입 가능
  DiveLog 관리 (기존 route)
    내 로그 목록: 검색, 날짜, 국가, source, 확정 상태
    로그 상세 (기존 route 확장)
      요약 / 프로파일 / 사진 / 환경 / 원본 출처
      편집 (기존 route 확장)
        기본 정보 + AI Copilot + 확인/저장
    가져오기 Wizard (신규 하위 화면)
  다이빙 컴퓨터 (기존 bluetooth-devices)
    연결 상태와 '로그 동기화 지원'을 별도 표시
  내 생물 도감 (후속)
  프로필
    내 다이빙 통계 (기존 ProfileStats 확장)
  설정
    기존 AI 설정 + 이미지/음성 동의·비용/보존 안내
```

신규 로그 저장 후 자동 피드 공개하지 않는다. 기존 수동 게시물 작성은 종전 publish 선택을 유지하며 신규 import/AI 경로는 private 기본값이다. 일상 게시물은 다이빙 통계/장비 측정 AI에서 제외한다.

### 목표 작성 flow

```text
수동 시작 또는 지원 기기 sync / 파일 import
 → 원본 검증·표준 변환·서버 draft
 → 사진 선택 / 시간 매칭 후보
 → EXIF/GPS 추출 (AI 0회)
 → 확정 위치·시각의 환경 수집 (실패 시 건너뜀)
 → 새 사진만 분석 (선택, 평균 3장 / 최대치는 정책 설정)
 → 짧은 메모 또는 음성 (선택)
 → AI Draft: structured suggestions + narrative
 → 원본/사용자/AI 배지와 충돌·불확실 항목 표시
 → Accept / Edit / Ignore
 → 서버 확정 저장
 → 선택 시 피드/릴스/SNS 발행
```

UI 규칙: 단일 긴 폼 대신 기본/사진/메모/검토 섹션, 필요한 항목만 펼치기. 컴퓨터 원본은 우선 표시하되 수정 시 “사용자 보정” 이력을 남긴다. 번역 JSON 4종을 모두 추가하고 AI locale은 서버 요청의 허용 값으로 전달한다. 빈 데이터·미지원·권한 거절·저장 충돌·AI 예산 소진을 서로 다른 상태로 표시한다.

수천 건은 FlatList와 서버 keyset pagination을 사용한다. log store는 서버 응답 cache/편집 상태로 제한하고 영구 원장으로 쓰지 않는다. offline outbox는 기존 expo-sqlite를 우선 검토하되 소유자별 저장·암호화 필요성을 검증한다. 앱 종료 중 업로드 재개를 지원한다고 표시하기 전 실제 file URI 유효성·권한 수명을 테스트한다.

## STEP 10. AI Architecture

### 서버 중심 파이프라인

```text
Mobile (선택·메모·동의)
 → Auth + Owner + Budget gate
 → Evidence loader (DB의 검증된 source/facts/assets)
 → Deterministic resolver (단위/시각/우선순위/중복)
 → Task orchestrator
     Image semantic analysis → versioned cache
     Voice STT → 원문 transcript → 구조화 후보
     Draft narrative / suggestion generator
     Search interpreter (후속)
 → Schema / evidence / numeric guards
 → Draft result (확정 저장 아님)
 → 사용자 확인 → revision transaction
```

### 생성 결과 계약

```json
{
  "schemaVersion": 1,
  "baseRevision": 4,
  "structuredLog": { "selectedFactIds": ["fact-device-1"] },
  "narrative": "...",
  "highlights": [],
  "marineLife": [{ "label": "sea turtle", "taxonId": null, "confidence": 0.84, "source": "AI_IMAGE_ANALYSIS", "userConfirmed": false, "evidenceAssetIds": ["asset-1"] }],
  "environment": { "snapshotIds": [] },
  "uncertainItems": [{ "field": "marineLife.0.taxonId", "reason": "species_not_established" }],
  "suggestions": [{ "id": "s1", "action": "add_observation", "status": "pending", "evidenceRefs": ["asset-1"] }]
}
```

structuredLog의 측정값은 LLM 출력을 신뢰해 복사하지 않고 deterministic resolver가 구성한다. AI는 허용된 suggestions/narrative를 반환한다. 사진 속 문자·음성·memo는 비신뢰 데이터로 격리하며 도구 호출, URL fetch, SQL, 시스템 지시로 실행하지 않는다.

### 사실성·안전·프라이버시

- 측정값이 28.4m일 때 AI가 30m를 쓰면 검증 실패 또는 고정 템플릿으로 복구한다. 측정 수치는 가능하면 서버 토큰 치환으로 서술한다.
- schema 검증만으로 환각이 사라지지 않는다. evidence ID와 source 일치, 허용 필드, 수치 일치, 사용자 검토를 함께 적용한다.
- confidence 0.84는 객관적 84% 정확도 보증이 아니다. 모델/데이터셋별 보정 전에는 참고 점수로 표시한다.
- 종을 모르면 turtle/fish 등 상위 분류·unknown을 허용한다. 여러 사진에서 같은 개체라고 단정하지 않는다.
- 사용자 확정은 종의 과학적 검증과 다르다. confirmedByUser와 externallyVerified를 혼합하지 않는다.
- 이미지·음성 전송 전에 목적·제공자·보존·삭제 동의를 받는다. 기존 AI 설정 토글을 새로운 이미지/음성 동의로 간주하지 않는다.
- GPS·일련번호·연락처·raw profile은 최소 전송. 이미지 파생본은 불필요한 EXIF를 제거하고 provider retention 옵션은 실제 계약을 확인한다.
- 의료·감압·상승 허용·다이빙 가능 판정·안전 보장은 생성하지 않는다. 개인 인사이트는 관찰된 기록의 요약에 한정한다.
- HealthKit 유래 데이터를 광고·AdMob 타겟팅/이벤트에 섞지 않는다. 플랫폼 정책·동의 검토는 별도 release gate다.

### 모델 설정과 비용

서버의 versioned AI Model Configuration: task, provider, model, promptVersion, schemaVersion, imageResolution, maxOutputTokens, timeout, retryLimit, enabled, budget. 현재 OPENAI_MODEL env override는 재사용하되 앱의 EXPO_PUBLIC_OPENAI_MODEL 표시와 실제 서버 모델이 어긋나지 않게 capabilities API로 통일한다. API 키는 앱에 포함하지 않는다.

cache key는 최소 owner + image content hash + 분석 task/model/prompt/schema 버전. 같은 원본의 재선택·최종 로그 문구 수정은 이미지 재분석을 하지 않는다. user-confirmed 상태는 cache 결과를 직접 변형하지 않고 observation에 저장한다. 공유 cache는 private 사진 존재 유출 위험 때문에 MVP에서 사용하지 않는다.

10,000 users / 1,000 logs/day / 3 photos/log 가정:

- 최대 신규 분석 대상 3,000 photos/day, 30일 90,000장. 모델 호출 수는 batching/cache 정책에 따라 다르다.
- 최종 draft는 기본 1,000회/day 이하. 설정 변경 없는 같은 input hash 재시도는 결과 재사용.
- text memo 2,000자는 서버에서도 제한한다. 2,000자와 2,000 tokens는 같지 않다.
- 월 비용 = 이미지 처리 usage + draft input/output tokens + STT minutes + 검색/insight 선택 usage + media 저장/전송 + 환경 API. 가격은 모델 확정 시 공식 단가로 산정하고 여기서 임의 USD 금액을 만들지 않는다.
- day/user/global 예산을 예약한 뒤 호출, 사용량 정산·실패/취소 예약 해제. 재시도는 bounded backoff, 설정 오류는 재시도하지 않음.
- 관리자에는 USD 추정/확정 비용을 구별하고 usage 날짜·모델·cache hit·성공률·대기시간만 기본 노출한다.

기존 app_jobs worker는 알 수 없는 type도 완료 처리하므로 **AI type 배포 전에 worker 라우팅·type filter·lease/heartbeat·재시도·취소를 먼저 준비**한다. `index.js`의 관리자용 `processQueuedJobs`에도 동일한 type 분리가 필요하다. AI 전용 worker process로 격리하되 같은 PostgreSQL을 활용할 수 있다. push 지연과 AI 실패가 서로 전파되지 않게 한다. 근거: [관리자용 큐 실행 경로](/Users/kimseokgeun/Desktop/Works/divergram/api/server/index.js:1098).

## STEP 11. Dive Computer Integration Architecture

```text
DiveComputerProviderRegistry
  SuuntoProvider       ─┐
  ShearwaterProvider   ─┤
  GarminProvider       ─┼→ Raw artifact → Versioned parser → Standard DiveData
  AppleHealthProvider  ─┤                     → Provenance validation → Preview
  GenericImportProvider┘
```

계약은 capabilities(), connect(), disconnect(), listDives(cursor), fetchDive(id), normalize(raw), getSyncCheckpoint()로 구분한다. list와 fetch를 분리해 100개 한계를 제거한다. BLE permission/transport와 제조사 parser는 별도 모듈이며 model/firmware/OS 조합의 지원 매트릭스를 관리한다.

표준 DiveData는 `localDate`, `startedAt`, `endedAt`, `timezone/offset/precision`, `durationSeconds`, `maxDepthM`, `averageDepthM`, `measuredTemperatureC`, `depthSamples[{elapsedSeconds,depthM}]`, `ascentEvents`, `location`, `device{manufacturer,model,serialRef}`, `diveNumber`, `rawSourceId`, `parserVersion`을 가진다. 알 수 없는 값은 null/unknown이며 발생 날짜와 import 날짜를 분리한다.

| Provider | 공식 자료로 확인한 범위 | Divergram 적용 판단 / TODO |
| --- | --- | --- |
| Suunto | API Zone은 OAuth2, workout FIT, partner 승인 안내 | 기존 scaffold 재사용. 특정 다이브 모델/필드 제공은 별도 샘플·권한 확인; D5 등 모든 모델 자동 지원이라고 약속하지 않음 |
| Garmin | Activity API는 승인 후 FIT 등 활동 파일 접근 | Descent의 필요한 dive samples가 계정 권한·파일에 포함되는지 검증; 가상 endpoint 금지 |
| Shearwater | Cloud Desktop 공식 릴리스 문서에 UDDF export/reimport | 파일 기반 PoC 우선 후보. 새 Dive Shearwater와 구 Cloud 기능을 동일시하지 않음. 공개 제3자 cloud API는 이번 조사에서 확인하지 못함 |
| Apple Watch Ultra | HealthKit waterTemperature/underwaterDepth 유형 존재 | iOS HealthKit read permission·실제 sample·원본 source·시간 범위 검증. Oceanic+ 전체 dive log/감압 데이터 접근을 의미하지 않음; Android는 파일/API 가능한 범위만 |
| libdivecomputer | iOS/Android, BLE 등을 지원하는 LGPL 라이브러리 | 기기별 지원 확인·네이티브 bridge PoC·배포 라이선스 검토 후 채택 여부 결정. RN plug-and-play도 보편 파일 포맷도 아님 |

공식 근거: [Suunto API Zone](https://apizone.suunto.com/), [Suunto 시각·FIT FAQ](https://apizone.suunto.com/faq), [Garmin Activity API](https://developer.garmin.com/gc-developer-program/activity-api/), [Garmin FIT](https://developer.garmin.com/fit/overview/), [Shearwater Cloud Desktop 릴리스](https://downloads.shearwater.com/swc_release_notes/desktop_pdf/Shearwater-Cloud-Desktop-Release-Notes_2.11.8.pdf), [Dive Shearwater FAQ](https://shearwater.com/en-eu/pages/dive-shearwater), [Apple waterTemperature](https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/watertemperature), [libdivecomputer](https://www.libdivecomputer.org/index.html).

완료 기준은 BLE 연결 성공이 아니라 **실제 파일/기기에서 읽은 원본과 저장된 수치·샘플·일자·단위가 일치하고, 재동기화해도 중복되지 않는 것**이다. 권한·프로토콜 불명은 TODO/unsupported로 남긴다.

## STEP 12. Weather / Marine Provider Architecture

WeatherProvider와 MarineProvider는 query(lat,lng,start,end,requestedVariables), capabilities(coverage/history/units), normalize()를 제공한다. 현재 forecast/risk 화면과 과거 dive enrichment는 서비스·응답 타입을 분리한다.

- 기존 Stormglass API 호출은 서버 provider adapter로 이동하는 계획이다. 앱 공개 env key, 좌표만 cache, Date.now 기준 조회를 그대로 과거 로그에 쓰지 않는다.
- Stormglass historical coverage·quota·변수의 의미는 실제 계정/문서 확인 TODO다. 이번 docs 페이지는 본문을 추출하지 못해 지원 범위를 확정하지 않았다. [공식 문서](https://docs.stormglass.io/)
- Open-Meteo는 대안 후보이며 해양 변수·모델별 역사 구간이 다르다. 전세계 모든 날짜·해역·변수를 보장하지 않는다. 상업 서비스 조건은 채택 전에 확인한다. [공식 Marine API](https://open-meteo.com/en/docs/marine-weather-api)
- 지원 후보는 기온, 풍속/풍향, 날씨, 강수, 파고/주기, SST, 조석, 해류, 일출/일몰이다. provider가 주지 않는 변수는 unavailableReason과 함께 null.
- SST는 해수면 온도이지 컴퓨터 수중 수온이 아니다. 기상 visibility는 수중 가시거리가 아니다. 파고/조류도 점 위치 실측이 아닌 모델 grid값이면 modelled로 표시한다.
- 각 값에 unit, validTime, retrievedAt, provider, upstreamModel, temporal/spatialResolution, source, quality를 기록한다. cache는 출처가 아니라 전달 상태다.
- cache key: provider/model/version + 적절한 공간 cell + 시간 범위 + 변수 목록. tide처럼 해안 지형 민감값은 거친 cell 공유를 하지 않는다.
- GPS/시간 미확정이면 자동 호출하지 않는다. 요청을 위한 위치 확정과 원본 시각 선택을 먼저 받는다. 날짜밖에 없으면 하루 범위 정보이지 해당 dive 순간이라고 표시하지 않는다.
- snapshot을 저장해 provider의 후속 재분석 데이터로 과거 확정 로그가 조용히 바뀌지 않게 한다. 갱신은 새 source/revision.

## STEP 13. Import Architecture

### Wizard와 parser 범위

```text
파일/기기 선택 → MIME/크기/권한 확인 → format/version 감지
 → parser (AI 사용 안 함)
 → 단위/날짜/timezone/스쿠버·프리 구분 확인
 → 행별 validation + 표준 DiveData
 → exact duplicate + possible duplicate 검사
 → Preview: 신규/중복/충돌/오류와 원본 비교
 → 선택 commit → 서버 batch transaction + 결과 journal
 → 실패 행 재개 → 선택 사진 연결
```

- 초기 파일은 지원 dialect가 분명한 CSV/JSON 샘플과 실제 확보한 UDDF 샘플을 우선한다. FIT은 제조사 공식 schema와 decoder 검증 후 추가한다.
- “XML 지원”은 아무 XML이나 이해한다는 뜻이 아니다. UDDF version·제조사 dialect별 parser를 명시한다.
- libdivecomputer는 transport/parser library이며 임의 export 파일의 만능 parser가 아니다.
- XML의 DTD/external entity 금지, archive bomb·path traversal·거대 profile 제한, 스트리밍/배치 처리, CSV 따옴표/인코딩/소수점 locale, output CSV 수식 injection을 테스트한다.
- 원본은 hash와 함께 비공개 보관, parser version별 normalized 결과 저장. raw serial은 암호화하고 중복용으로는 server HMAC를 사용한다.

### 중복 정책

exact key: user + provider + device identity + stable external log ID. 원본 파일 hash는 동일 파일 재실행 감지에 사용하며 각 dive row identity를 대체하지 않는다.

fallback candidate: 확정 시간/offset, duration, maxDepth, dive number, 기기, 위치. 시간 ±범위·단위 정규화 허용오차는 파일 종류별 설정한다. 날짜·수심만 같은 두 다이빙은 자동 병합하지 않는다. freediving 반복 잠수도 단일 session과 개별 dive를 구분해야 한다.

possible duplicate는 사용자 Preview로 보낸다. merge는 source 추가와 선택 facts 기록이지 원본 덮어쓰기/삭제가 아니다. 서버 unique/transaction으로 동시 재시도도 보호하고 user 범위를 벗어난 비교는 하지 않는다.

commit은 100~200행 단위의 제안값으로 시작해 1,000/10,000건 fixture로 조정한다. 부분 성공 상태와 item 결과를 남겨 재시작 시 성공분을 다시 만들지 않는다. 취소는 새 batch 시작을 중지하고 이미 확정된 건수는 숨기지 않는다.

### 사진 자동 연결

captureTime 원문, UTC로 확정 가능 여부, camera timezone/clock offset을 분리한다. offset 없는 EXIF를 휴대폰 현재 timezone으로 확정하지 않는다. dive 시작/종료 사이 또는 사용자 설정 여유 범위로 후보를 만들되, 구간 중첩·보트 위 촬영·촬영시각 누락은 검토 대상으로 둔다. EXIF 미존재·라이브러리 권한 축소·GPS 제거 파일에서도 작성은 가능해야 한다.

## STEP 14. Migration Plan

### 실행 전 승인 게이트

1. 운영 스키마·테이블 건수·ID/FK 타입·실제 nullable 범위·index 확인. 현재 코드와 prod DDL 차이를 기록한다.
2. 기존 post 중 scuba/freediving/daily/unknown와 합성 콘텐츠를 집계한다. 샘플/운영 게시물을 실제 다이브로 자동 이관하지 않는다.
3. 백업과 restore rehearsal, 기존 1.2.9 API contract fixture, 다운타임/lock 예산을 확정한다.
4. 신규 데이터 보존, 삭제·동의·비공개 저장 방식, 초기 지원 파일·기기를 승인한다.

### 순서: expand → shadow → pilot → transition

| 단계 | 수행 제안 | 통과 조건 |
| --- | --- | --- |
| M0 | baseline·동작 fixture·복구 rehearsal | 현 앱/웹 피드·공유·로그 저장 회귀 기준 확보 |
| M1 | 신규 테이블/인덱스 추가. startup 대형 backfill 금지 | 구버전 읽기/쓰기 영향 없음, lock timeout 준수 |
| M2 | 신규 owner-only API + legacy read adapter; 기본 flag off | contract/auth/revision/idempotency 테스트 |
| M3 | dry-run backfill report, legacy_post_id unique로 재실행 안전 | 원본 rows/media URL/count 유지, 숫자 동일 |
| M4 | legacy scuba/free 후보만 한정 이관 | created_at을 diveDate로 꾸며내지 않음; 없으면 date_unknown |
| M5 | 기존 local/remote drafts 복구 경로 | 현재 기기에 남은 로그를 본인확인 후 업로드. 이미 소실된 메모리 로그 복구 가능하다고 약속하지 않음 |
| M6 | 내부 pilot: 새 API가 canonical, post는 선택 projection | publish가 한 transaction으로 link/media와 일치 |
| M7 | 구버전 post edit 동시 호환 | divergence/conflict를 revision으로 탐지, shadow reconciliation |
| M8 | 점진적 사용자 확대 | 오류율·저장 성공·충돌·비용·중복 지표 통과 |

이관된 legacy 데이터 출처는 확실한 증거가 없으면 IMPORT/LEGACY_UNKNOWN으로 기록한다. 오래된 게시물 수치를 DIVE_COMPUTER로 바꾸지 않는다. 원본 날짜가 없으면 AI·환경 데이터·사진 시간 매칭을 제한한다.

신규 사용자 경로의 확정 후 post 공개는 별도 행동이다. 구 앱이 동일 post를 수정하면 연결 로그에 묵시적 overwrite하지 않고 reconciliation issue나 사용자 수정 revision을 남긴다. 모든 API consumer가 전환되기 전 구 endpoint/컬럼을 제거하지 않는다.

### Rollback / 삭제

- feature flag를 내리면 기존 작성 화면으로 돌아간다. 새로 저장한 로그는 읽기/내보내기 가능하게 남기고 additive 테이블을 drop하지 않는다.
- 실패 backfill은 mapping journal 기준으로 생성분만 중단/복구한다. 기존 post/media·댓글/좋아요·URL은 유지한다.
- 원본의 불변성은 무기한 보존을 뜻하지 않는다. 계정 삭제·정당한 삭제 요청은 consent/source/analysis/cache/asset 연결까지 추적해 삭제한다.
- 공유된 asset은 참조 수와 소유권을 확인하고 물리 삭제한다. 백업에서의 삭제 지연과 외부 provider 보존 정책도 안내해야 한다.
- health/AI 원문·GPS·serial이 일반 운영 로그나 분석 SDK 이벤트에 남지 않게 점검한다.
- 기존 AdMob, 로그인, 푸시, Wallet, 리조트 예약 모듈은 유지한다. 이번 작업은 빌드/버전/스토어 배포를 포함하지 않는다.

## STEP 15. 구현 우선순위와 Task 분해

사용자가 제시한 Phase 1~10을 유지하되 **Phase 0 저장 무결성/계약 정리**를 선행한다. 파일 import로 실제 데이터 fixture를 확보하는 조사는 Phase 0부터 병행하지만, 사용자용 전체 Wizard는 Phase 8이다.

작업별 “변경/신규 파일”은 제안 경로다. tests 신규 파일은 해당 서버 모듈 옆 `*.test.js`, 모바일 순수 함수 fixture test를 기본으로 하며 기존 앱에는 독립 unit test script가 없으므로 T00에서 runner를 선택한다. 새 라이브러리 추가 전 기존 Node test+TypeScript 변환으로 순수 로직 검증 가능한지 확인한다.

### T00 / Phase 0: 저장 계약과 baseline

- 목적: 두 로그 경로 및 구버전 호환 계약 고정.
- 수정 대상: 없음(분석/테스트만). `app/src/lib/api.ts`, `diveLogSyncService.ts`, `DiveLogEditScreen.tsx`를 대상 fixture로 사용.
- 신규 파일: `api/server/lib/diveContracts.test.js`, `tools/fixtures/dive-import/`, `docs/DIVE_LOG_MIGRATION_RUNBOOK.md`.
- DB 변경: 없음; read-only inventory와 복구 rehearsal 계획.
- API 변경: 없음; 기존 요청/응답 계약 기록.
- 영향 범위: 로그/피드/기기 원본/웹/관리자 회귀 기준.
- 테스트 방법: 빈 값·자정·timezone·초/분·중복·계정 분리 합성 fixture, 양 플랫폼 기존 save/read.
- 완료 조건: P0/P1 이슈 재현과 rollback 기준, 지원 파일 샘플 확보; 승인된 스키마 없이 배포하지 않음.

### T01 / Phase 0: 영구 저장과 호환 adapter

- 목적: 저장 완료 후 재시작/다른 기기에서도 동일 로그 조회.
- 수정 대상: `api/server/index.js`, `app/src/lib/api.ts`, `app/src/stores/diveLogStore.ts`, `app/src/screens/dive-log/DiveLogEditScreen.tsx`.
- 신규 파일: `api/db/migrations/<timestamp>_add_dive_log_core.sql`, `api/server/routes/diveLogs.js`, `api/server/lib/diveLogRepository.js`, `app/src/services/diveLogRepository.ts`.
- DB 변경: core logs/sources/facts/revisions/post_links 추가형.
- API 변경: create/list/detail/patch/confirm, revision·idempotency.
- 영향 범위: 가져온 로그 저장/초안 삭제 순서; 기존 posts는 유지.
- 테스트 방법: 앱 kill/relaunch, 다른 기기, 응답 유실 재시도, 동시 편집, 다른 계정 IDOR.
- 완료 조건: 서버 commit 확인 전 초안 삭제 안 함; 중복 저장 0; stale revision 409; 기존 앱 호환.

### T02 / Phase 1: 표준 단위와 provenance resolver

- 목적: 원본/수정/추정 분리, 데이터 조작 금지.
- 수정 대상: `models/{DiveLog,ExternalDiveLog}.ts`, `services/{externalDiveLogMapper,diveLogSyncService,diveComputerAdapter}.ts`.
- 신규 파일: `app/src/models/DiveEvidence.ts`, `api/server/lib/diveNormalization.js`, `api/server/lib/diveEvidenceResolver.js`.
- DB 변경: T01 facts/source 제약 적용; 추가 테이블 없음.
- API 변경: schemaVersion·units·precision·selectedFact IDs.
- 영향 범위: importer와 향후 AI 입력 전체.
- 테스트 방법: null/0 구분, ft/m·sec/min, UTC/local, 동일 depth conflict, forged source, raw roundtrip.
- 완료 조건: 임의 날짜/측정값 생성 없음; 원본 불변; 사용자 보정은 별도 history.

### T03 / Phase 1: 작성·검토 UX 및 4개 언어

- 목적: 단일 작성 경험, 선택적 AI, 모든 필드 수정 가능.
- 수정 대상: `app/app/(tabs)/logs.tsx`, `screens/dive-log/{DiveLogEditScreen,DiveLogDetailScreen,DiveLogManagementScreen}.tsx`, `components/DiveLogCard.tsx`, `src/locales/{ko,en,ja,zh}.json`.
- 신규 파일: `app/src/components/dive/SourceBadge.tsx`, `app/src/components/dive/FactEditor.tsx`, `app/src/hooks/useDiveLogs.ts`.
- DB 변경: 없음(T01 계약 사용).
- API 변경: 목록 cursor 소비, confirm 사용, private/save/publish 분리.
- 영향 범위: 기존 테마·일상작성·가져온로그 관리.
- 테스트 방법: iOS/Android 작은 화면·큰 글자·키보드·4언어·offline·서버오류·없는 로그 ID.
- 완료 조건: AI 꺼짐/실패에도 저장, 새 import 비공개 기본, 일상 UX 유지, 서버 기반 복구.

### T04 / Phase 2: Media 원본·EXIF 공통화

- 목적: 사진 hash/촬영시각/GPS를 AI 이전에 확보.
- 수정 대상: `models/MediaFile.ts`, `services/cloudinaryService.ts`, 두 작성 화면, `api/server/routes/media.js`, `web/src/utils/exifGps.ts`(회귀 테스트 대상).
- 신규 파일: `app/src/services/photoMetadataService.ts`, `api/server/routes/diveAssets.js`, `<timestamp>_add_dive_assets.sql`.
- DB 변경: assets/media_links.
- API 변경: asset init/complete/private download; 기존 public post upload 유지.
- 영향 범위: 미디어 선택·업로드·삭제·원본 privacy.
- 테스트 방법: iOS HEIC/JPEG/Android image, metadata 없음, GPS 0·음수, 방향, 같은 파일 재선택, 권한 거절·소유권.
- 완료 조건: 원본/파생본 식별 분리, metadata 없는 파일도 저장, 타계정 raw 접근 불가.

### T05 / Phase 2: 시간 기반 사진 후보

- 목적: 사진을 정확한 dive에 연결하도록 제안.
- 수정 대상: `DiveLogEditScreen.tsx`, `MediaFile.ts`.
- 신규 파일: `app/src/services/photoDiveMatcher.ts`, `app/src/components/dive/PhotoMatchReview.tsx`.
- DB 변경: media_links에 match evidence/confirmation 기록.
- API 변경: media-matches 및 링크 확인.
- 영향 범위: 동일 날짜 여러 dive·해외 timezone.
- 테스트 방법: 자정, DST, clock drift, 두 dive 구간 중첩, 보트사진, 시간 미상.
- 완료 조건: 모호한 후보 자동 확정 금지; reject/edit 가능; AI 호출 0회.

### T06 / Phase 3: AI 작업·비용·동의 기반

- 목적: cache와 budget, 실패 격리, 안전한 worker.
- 수정 대상: `api/server/queue-worker.js`, `api/server/index.js`의 processQueuedJobs, `api/server/routes/{aiGeneration,aiSettings}.js`, `adm/src/AdminApp.jsx`, `adm/src/lib/api.js`.
- 신규 파일: `api/server/ai/{taskRegistry,modelConfig,budgetService}.js`, `api/server/dive-ai-worker.js`, `<timestamp>_add_dive_ai_runs.sql`, `adm/src/sections/DiveAiUsageSection.jsx`.
- DB 변경: ai_runs, model config/version, budget reservation; app_jobs type/lease 확장 승인 필요.
- API 변경: job status/cancel, capabilities, usage; 동의 검증.
- 영향 범위: push worker와 분리 필수, 일반 저장 실패 전파 금지.
- 테스트 방법: duplicate enqueue, provider timeout, 429, process kill/reclaim, 취소, 초과 예산, 동의 철회.
- 완료 조건: 동시 같은 입력 한 작업, unknown task 완료 처리 금지, USD 추정/확정 구별, 키 비노출.

### T07 / Phase 3: Photo AI / 캐시

- 목적: 생물/환경 후보 분석, 같은 사진 반복 비용 방지.
- 수정 대상: `app/src/services/aiService.ts`, `DiveLogEditScreen.tsx`.
- 신규 파일: `api/server/ai/imageAnalysis.js`, `api/server/ai/imageAnalysisSchema.js`, `<timestamp>_add_image_analyses.sql`.
- DB 변경: image_analyses + asset/task version unique.
- API 변경: analyze job, evidence 결과.
- 영향 범위: 이미지 전송 동의·private asset 접근.
- 테스트 방법: 동일 hash 동시 요청, unknown species, 위장 텍스트 prompt injection, 잘못된 JSON, 다른 계정 asset.
- 완료 조건: species 불확실 표시, 실측 변경 0건, 3장 재편집 시 재분석 0회(동일 정책 버전).

### T08 / Phase 4: AI Draft Generator

- 목적: 증거 기반 structured 후보/narrative 분리 생성.
- 수정 대상: `aiService.ts`, `api/server/routes/aiGeneration.js`, `DiveLogEditScreen.tsx`, AI 설정 화면.
- 신규 파일: `api/server/ai/{diveDraftGenerator,evidenceGuard}.js`, `api/server/routes/diveAiDrafts.js`, `app/src/models/DiveAiDraft.ts`.
- DB 변경: ai_runs 결과·revision 참조 사용.
- API 변경: ai-drafts, typed result, baseRevision.
- 영향 범위: 기존 summary/caption은 호환 유지, 신규 경로만 통합.
- 테스트 방법: 수정된 원본 수치 거부, 없는 버디/종 생성, 누락값, 4언어, 생성 중 사용자 수정, timeout fallback.
- 완료 조건: measured structured 값 LLM 덮어쓰기 불가; 최신 revision 아니면 재검토; 일반 save는 독립.

### T09 / Phase 4: Copilot Accept/Edit/Ignore

- 목적: AI 제안을 사용자가 선택하고 되돌릴 수 있게 함.
- 수정 대상: 편집/상세 화면, 4개 locale 파일.
- 신규 파일: `app/src/components/dive/CopilotPanel.tsx`, `api/server/lib/diveSuggestionReview.js`.
- DB 변경: 사실·revision·observation 상태 사용.
- API 변경: suggestions review.
- 영향 범위: AI/수동 최종 확정 UX.
- 테스트 방법: 중복 tap, ignore 후 재생성, 타기기 conflict, 사용자 보정·undo.
- 완료 조건: 승인 전 확정 필드·도감 미반영; 모든 변경에 actor/time/evidence.

### T10 / Phase 5: Voice Memo

- 목적: 녹음/전사 원문과 구조화 후보를 보존.
- 수정 대상: `app/app.config.ts`, `app/app.json`, `app/ios/Divergram/Info.plist`, `app/android/app/src/main/AndroidManifest.xml`, 편집 화면.
- 신규 파일: `app/src/components/dive/VoiceMemoInput.tsx`, `app/src/services/voiceMemoService.ts`, `api/server/routes/diveVoiceMemos.js`, `api/server/ai/voiceMemo.js`.
- DB 변경: private asset type/audio + transcript/structured result references.
- API 변경: voice memo job 및 audio/transcript 삭제.
- 영향 범위: 신규 microphone permission·네이티브 build; 기존 image/video upload와 분리.
- 테스트 방법: 녹음 중 전화/백그라운드, 권한 거절, 다른 언어, 오전사 수정, 원본 삭제, 음성 미보존 옵션.
- 완료 조건: transcript 수정 이력·원문 구별, STT 숫자가 측정값으로 승격 안 됨. 녹음 패키지는 기존 의존성 검토 후 최소 도입 승인.

### T11 / Phase 6: 과거 환경 provider

- 목적: dive 시점의 제공 가능한 환경만 연결.
- 수정 대상: `services/stormglassService.ts`, `models/MarineWeather.ts`, `MarineWeatherScreen.tsx`(현 화면 호환).
- 신규 파일: `api/server/environment/{providerRegistry,stormglassProvider}.js`, `routes/diveEnvironment.js`, `<timestamp>_add_dive_environment.sql`.
- DB 변경: snapshot/cache.
- API 변경: environment job/query.
- 영향 범위: 공개 env key 제거 계획, 현재 forecast와 historical 분리.
- 테스트 방법: provider 미설정·과거 범위 밖·land point·SST 대 수중온도·시야 부재·stale cache.
- 완료 조건: sample 값 미혼합, 필드별 source/time/unit, 없는 데이터 null, 안전 승인 문구 없음.

### T12 / Phase 7: 기기 capability/원본 bridge

- 목적: 연결 성공과 sync 지원 분리, 모델별 확장.
- 수정 대상: `DiveComputerAdapter`, `nativeBleDiveService`, `bluetoothDiveService`, `BluetoothDeviceScreen`, `ExternalDiveLog`.
- 신규 파일: `app/src/services/dive-computers/{types,registry,GenericImportProvider}.ts`, `api/server/lib/diveRawIngestion.js`.
- DB 변경: source device identity/attestation 사용.
- API 변경: capabilities, raw ingestion, checkpoint.
- 영향 범위: BLE UI·배터리·foreground/background 제한.
- 테스트 방법: scan only model, disconnect, timeout, packet interruption, raw checksum.
- 완료 조건: 지원하지 않는 parser는 명시적 unsupported, cloud 원본을 BLE로 재라벨링하지 않음.

### T13 / Phase 7: 제조사별 수집 PoC 및 단계 출시

- 목적: 실제 Suunto/Garmin/Shearwater/Apple 데이터를 정확히 수집.
- 수정 대상: `services/{suuntoService,garminService,shearwaterService,providerTokenService}.ts`, `api/server/routes/integrations.js`.
- 신규 파일: `api/server/dive-computers/{suunto,garmin,shearwater}.js`, `app/src/services/dive-computers/AppleHealthProvider.ts`, 필요 시 승인된 native bridge.
- DB 변경: 암호화 credentials/refresh rotation·sync checkpoint, 기존 integration 자료 호환.
- API 변경: 공식 OAuth/refresh/webhook 또는 import 경로, sync pagination.
- 영향 범위: vendor 승인/기기 보유/OS entitlement/오픈소스 라이선스 의존.
- 테스트 방법: 제조사별 1기기 이상 원본 비교, 재승인·토큰만료·누락 fields·수백건 backfill·중복.
- 완료 조건: provider별 독립 통과. 하나 미승인이 다른 provider 출시를 막지 않으며 미지원 기능을 성공처럼 노출하지 않음.

### T14 / Phase 8: 파일 parser·중복 engine

- 목적: 과거 로그를 preview 가능한 표준 행으로 변환.
- 수정 대상: `diveLogSyncService.ts`의 샘플 수동 import 진입; 기존 mapper는 호환 wrapper로 유지.
- 신규 파일: `api/server/imports/{registry,csv,json,uddf,deduplication}.js`, `<timestamp>_add_dive_import_jobs.sql`, `api/server/routes/diveImports.js`.
- DB 변경: import jobs/items, unique source identities.
- API 변경: upload/preview/commit/status/cancel.
- 영향 범위: 서버 자원·원본 보안·과거데이터 중복.
- 테스트 방법: 1/1,000/10,000 dives, malformed XML, XXE, CSV locale, duplicate file·cross-provider 후보·중단재개.
- 완료 조건: AI 호출 0회, 원본 보존, 정확중복 재생성 0, 모호한 중복 수동확인, 행별 오류 유지.

### T15 / Phase 8: Import Wizard UI

- 목적: 파일 선택부터 부분 성공 내역까지 사용자 통제.
- 수정 대상: DiveLogManagementScreen, sitemap, 4개 locale.
- 신규 파일: `app/app/(tabs)/dive-log-import.tsx`, `app/src/screens/dive-log/DiveLogImportScreen.tsx`.
- DB 변경: 없음(T14 사용).
- API 변경: T14 소비.
- 영향 범위: file picker 신규 capability 검토, 모바일 대용량 메모리.
- 테스트 방법: parser format 미지원, timezone 선택, 오류행 제외, 미리보기후 파일/옵션 변경, 재로그인·재개.
- 완료 조건: preview 안 한 수치를 자동 확정하지 않음; 수천행 가상화; commit 결과가 화면과 서버 일치.

### T16 / Phase 9: Marine Life Collection

- 목적: 확인된 생물 관찰을 개인 도감으로 집계.
- 수정 대상: profile/menu/sitemap/locale, dive detail.
- 신규 파일: `api/server/routes/marineCollection.js`, `<timestamp>_add_marine_observations.sql`, `app/src/screens/dive-log/MarineCollectionScreen.tsx`.
- DB 변경: observations, 필요 시 taxonomy catalog.
- API 변경: collection list/detail, observation review.
- 영향 범위: AI 결과·로그 삭제·사진 공유범위.
- 테스트 방법: 한 dive 거북이 사진 3장, AI 후보 reject/종변경, 로그/asset 삭제, 날짜 미상.
- 완료 조건: 기본 Observed는 고유 dive 수로 정의(개체 수와 구별); 첫/마지막 날짜는 알려진 실제 dive 날짜만; rejected 미집계.

### T17 / Phase 10: SQL 검색과 통계

- 목적: 개인 기록을 정확하고 빠르게 찾고 집계.
- 수정 대상: `api.ts` profile summary/activity, ProfileStats, 관리 목록.
- 신규 파일: `api/server/lib/diveSearchFilters.js`, `api/server/routes/diveStatistics.js`.
- DB 변경: user/date/site/country/type 필터 인덱스, 필요 시 aggregate view.
- API 변경: typed filters/statistics.
- 영향 범위: 과거 게시물 숫자와 새 true dive 숫자 차이 사용자 안내.
- 테스트 방법: daily 제외, 삭제/미확정 제외, null 온도·duration 0, cross-year timezone, avg와 weighted avg 구분, EXPLAIN.
- 완료 조건: SQL 집계와 fixture 일치; count/합계/평균의 표본 수 표시; post 수를 dives로 사용하지 않음.

### T18 / Phase 10: 자연어 조건 해석

- 목적: 자연어를 제한된 검색 필터로 변환.
- 수정 대상: 검색 화면/AI config/locale.
- 신규 파일: `api/server/ai/diveSearchInterpreter.js`, `app/src/components/dive/DiveSearchConditions.tsx`.
- DB 변경: 없음; query interpretation cache는 정책상 선택.
- API 변경: interpret → validation → 일반 GET filters.
- 영향 범위: 검색만; SQL 실행 권한 AI에 없음.
- 테스트 방법: “작년”, 20도 이하, 30m 이상, 미확인 생물, 악성 SQL 요청, 언어 4종.
- 완료 조건: 해석된 기간·단위·조건 표시/수정 가능; owner scope 강제; 모델 오류여도 일반 필터 검색 가능.

### T19 / Phase 10: 관찰 기반 Insights

- 목적: 기록 기반 개인 요약; 안전 결론 금지.
- 수정 대상: profile stats/AI 설정.
- 신규 파일: `api/server/ai/diveInsights.js`, `app/src/components/dive/DiveInsightsCard.tsx`.
- DB 변경: ai_runs에 aggregate input hash 결과 사용.
- API 변경: 선택적 insights job.
- 영향 범위: 데이터 충분성·사용량·민감 데이터.
- 테스트 방법: 한 건/없는 데이터, 선택편향, “다음 dive 가능?”·감압·의료 질문, 수치 불일치.
- 완료 조건: 근거기간·표본 수 명시, 안전보장·의료판정 차단, 비활성 가능.

### T20 / 전체 Phase: 마이그레이션·보안·릴리스 게이트

- 목적: 기존 기능과 데이터 보존, 단계적 배포.
- 수정 대상: 승인된 migrations, feature flags, 기존 release checklist; 기존 로그인/AdMob/push/Wallet 모듈은 기능 제거 금지.
- 신규 파일: `tools/verify-dive-migration.mjs`, `app/.maestro/dive-log-roundtrip.yaml`, `docs/AI_DIVE_LOG_RELEASE_CHECKLIST.md`.
- DB 변경: dry-run/backfill journal, concurrent index 정책; 실제 적용은 승인 후.
- API 변경: 구버전 contract 회귀·feature flag.
- 영향 범위: iOS/Android/Web/Admin 및 계정 삭제.
- 테스트 방법: restore, 구버전쓰기+신버전읽기, private IDOR, 삭제 전파, 네트워크 단절, 10k import load, media/cache budget.
- 완료 조건: 저장 왕복·원본 보존·중복 방지·비공개·4언어·구버전 호환 통과 후에만 테스트 배포. 기기 실측/E2E 없이 전 기능 완료 선언 금지.

### 의존성과 권장 착수 범위

```text
T00 → T01 → T02 → T03
                  → T04 → T05
                  → T06 → T07 → T08 → T09
                                    → T10
                  → T11
                  → T12 → T13
                  → T14 → T15
                      T07/T09 → T16
                  → T17 → T18 → T19
T20: 모든 단계의 승인/검증/rollback 게이트
```

첫 구현 승인은 **T00~T03** 범위가 적절하다. 먼저 영구 저장·단위·출처·수동 검토 UX를 완료하고, 이를 사진 및 AI의 기반으로 쓴다. 이 단계에서 제조사 연동이나 AI 이미지 분석을 완성한 것처럼 표시하지 않는다.

### 구현 전 결정할 항목

| 결정 | 제안 기본값 | 결정 이유 |
| --- | --- | --- |
| canonical 저장 | 독립 app_dive_logs + 기존 post link | private 로그와 SNS 분리 |
| 새 AI/import 공개 범위 | private | 묵시적 공개 방지 |
| 원본 사용자 수정 | immutable original + user correction | 편집 자유와 측정 무결성 양립 |
| 기기/파일 첫 지원 | 실제 확보한 제조사 샘플/기기부터 | 이름만으로 지원 약속 금지 |
| AI/photo/voice 동의 | 별도 선택 동의 및 언제든 철회 | 기존 text AI 토글과 다른 데이터 |
| 원본 보존기간·음성 보존 | 명시적 정책 승인 필요 | 저장비용·개인정보·삭제 대응 |
| AI/환경 운영 예산 | 관리자 USD 일/월 상한을 출시 전 확정 | 무제한 호출 방지 |
| freediving 계수 | session과 개별 dive 별도 | 반복 잠수를 중복/통계오류로 처리하지 않음 |

## 최종 판정

현재 시스템은 **재사용 가능한 기반이 많지만, 통합 AI 로그 원장의 무결성과 실제 provider 수집은 아직 완성되지 않았다.** UI 전체 재작성이나 새 백엔드 프레임워크 도입보다, 영구 저장·출처·단위·확정 revision을 먼저 안정화하는 것이 가장 작은 안전한 변화다.

이번 산출물은 이 분석 문서뿐이다. 앱/서버 소스, DB, 인증, 외부 provider 설정, 공개 스토어는 변경하지 않았다. 구현 승인 뒤에도 각 Phase 완료와 전체 플랫폼 완료를 구분해서 보고해야 한다.
