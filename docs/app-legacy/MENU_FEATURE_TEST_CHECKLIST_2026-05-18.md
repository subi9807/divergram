# Divergram Native App 메뉴/기능 분석 체크리스트

- 기준일시: 2026-05-18 (KST)
- 대상: `/Volumes/WD_Elements/Works/divergram_app`
- 비교기준: divergram.com 운영 웹 구조(동일 저장소 `src/*` 웹 앱 코드)

## 1) 메뉴 구조도

### 1-1. 인증(Auth)
- `/(auth)/welcome`
- `/(auth)/login`
- `/(auth)/privacy`
- `/(auth)/terms`

### 1-2. 하단 탭(Primary 5)
- `/(tabs)/feed` (index)
- `/(tabs)/explore`
- `/(tabs)/create` (`logs` alias)
- `/(tabs)/messages`
- `/(tabs)/profile`

### 1-3. 헤더 메뉴(Quick)
- `/(tabs)/settings`
- `/(tabs)/activity`
- `/(tabs)/saved`

### 1-4. 헤더 메뉴(More)
- `/(tabs)/reels`
- `/(tabs)/resorts`
- `/(tabs)/location`
- `/(tabs)/notifications`
- `/(tabs)/admin`

### 1-5. 기타 내부 페이지(숨김 라우트)
- `/(tabs)/search`
- `/(tabs)/account`
- `/(tabs)/post`
- `/(tabs)/report`
- `/(tabs)/profile-edit`
- `/(tabs)/devices`

## 2) 메뉴별 기능 정리

| 메뉴 | 핵심 기능 | 데이터 소스 |
|---|---|---|
| Feed | 피드 리스트, 무한스크롤, 당겨서 새로고침, 에러/빈상태 | `apiClient.getFeed` (`posts/profiles/likes/comments`) |
| Explore | 검색 UI, 토픽칩, 탐색카드 렌더 | `apiClient.getExplore` + 샘플 폴백 |
| Create(Logs) | 다이브 로그 입력, 필수값 검사, 저장 mutation | `apiClient.createLog` |
| Messages | 채팅방 요약/미확인 배지/검색 UI | 테스트 샘플 |
| Profile | 프로필 요약, 완성도, 빠른메뉴 이동 | `useAuth + apiClient.getMe` |
| Settings | 언어 전환(ko/en/ja/zh), 알림 스위치, 하위 페이지 이동, 로그아웃 | Zustand(`settingsStore`) + Auth |
| Resorts | 리조트 목록/필터/요약 카드 | `apiClient.getResorts` + 샘플 폴백 |
| Reels | 릴스형 카드 스크롤 UI | 로컬 샘플 텍스트 |
| Location | 지도 플레이스홀더 + 위치 카드 목록 | `apiClient.getExplore` + 샘플 폴백 |
| Notifications | 알림목록, 전체 읽음 처리 | 테스트 샘플 |
| Search | 검색어 필터링 결과 | `apiClient.getExplore` + 샘플 폴백 |
| Saved | 피드 데이터 일부 저장목록 형태 표시 | `useFeed` 기반 |
| Activity | 활동로그 리스트 | 테스트 샘플 |
| Account | 계정 정보 카드/보안 메뉴 UI | `useAuth` |
| Report | 텍스트 신고 입력/전송(로컬 완료 Alert) | 로컬 상태 |
| ProfileEdit | 이름/소개 수정 UI/완료 Alert | `useAuth` 초기값 |
| Post | post query 기반 단일 포스트 렌더 | `useFeed` |
| Devices | BLE 스캔/연결/해제, 라이브 차트, 권한게이트 | `useBle` |
| Admin | 접근제한 안내 UI | 로컬 정적 |

## 3) 기능 테스트 결과 체크리스트

### 3-1. 구조/정합성 테스트
- [x] 사이트맵 route 25개 모두 titleKey 존재(ko/en/ja/zh)
- [x] 사이트맵 route 25개 모두 실제 파일 존재
- [x] DgTabHeader quick/more 설명 키(`menu.desc.*`) 다국어 존재

### 3-2. API 응답 테스트(읽기)
- [x] `GET /api/health` 정상 (`200`)
- [x] `GET /api/data/posts` range/order 정상 (10건)
- [x] `GET /api/data/profiles` 정상 (9건)
- [x] `GET /api/data/likes` 정상 (4건)
- [x] `GET /api/data/comments` 정상 (1건)
- [x] `GET /api/data/posts?limit=80` 정상 (55건)
- [x] `GET /api/data/profiles(account_type=resort)` 정상응답(0건)

### 3-3. 메뉴 기능 테스트
- [x] Feed: 데이터 로드/무한스크롤/새로고침 핸들러 연결 확인
- [x] Feed: 에러/빈상태 fallback UI 확인
- [x] Explore: 검색 입력/토픽 선택 UI 동작 확인
- [x] Explore: API 빈값 시 샘플 카드 폴백 확인
- [x] Create(Logs): 제목+위치 필수검사 후 저장 버튼 활성화 확인
- [ ] Create(Logs): 실서버 write 테스트 (운영 데이터 오염 방지로 미실행)
- [x] Messages: 샘플 룸 데이터 렌더/미확인 카운트 계산 확인
- [x] Profile: 편집/저장/활동/설정 이동 라우팅 확인
- [x] Settings: 언어 변경 스토어 반영 + i18n changeLanguage 연결 확인
- [x] Settings: 알림 토글 상태 반영 확인
- [x] Resorts: 필터(all/top/reviewed) 동작 확인
- [x] Resorts: API 0건 시 샘플 리조트 폴백 확인
- [x] Location: 탐색 데이터 카드 렌더 + 샘플 폴백 확인
- [x] Search: 입력어 includes 필터링 + 샘플 폴백 확인
- [x] Notifications: 전체 읽음 처리 상태 업데이트 확인
- [x] Saved: feed 기반 8개 슬라이스 렌더 확인
- [x] Activity: 샘플 활동 로그 렌더 확인
- [x] Account: 사용자명/이메일 바인딩 확인
- [x] Report: 빈값 비활성화/입력 후 제출/초기화 확인
- [x] ProfileEdit: 입력 상태 저장/완료 Alert 확인
- [x] Post: `post` param 우선 조회 fallback 확인
- [x] Devices: BLE scan/connect/disconnect 및 차트 데이터 플로우 확인

### 3-4. 빌드/품질 테스트
- [x] `npx eslint` (이번 수정 파일 한정) 통과
- [ ] `npm run lint` 전체 통과 실패
- [ ] `npm run build:web` 실패
- [ ] `npx tsc --noEmit` 전체 통과 실패

## 4) divergram.com 대비 기능/UIUX 차이점 (변경 없음, 비교만)

### 4-1. 기능 차이
- [DIFF] Feed: 웹은 좋아요/저장/팔로우/댓글/공유/수정/삭제가 실제 DB 반영, 네이티브는 카운트 표시 중심(read-mostly).
- [DIFF] Explore: 웹은 `posts/reels/people/resorts` 다중 검색 타입 + 스크롤 추가로딩, 네이티브는 단일 카드 피드 기반.
- [DIFF] Messages: 웹은 실시간 룸/메시지 CRUD, 네이티브는 샘플 룸 요약 UI.
- [DIFF] Notifications: 웹은 DB 알림/프로필 이동 연동, 네이티브는 샘플 + 읽음 처리.
- [DIFF] Create: 웹은 미디어 업로드/멘션/상세 다이브폼, 네이티브는 로그폼 경량 버전.
- [DIFF] Location: 웹은 Google Map + marker cluster + 포인트 포커싱, 네이티브는 map placeholder UI.
- [DIFF] Reels: 웹은 실제 비디오 플레이/음소거/좋아요/저장/팔로우, 네이티브는 샘플 카드형 릴스 UI.
- [DIFF] Settings: 웹은 다크모드/하단탭 커스터마이징/BLE 관리가 더 깊음, 네이티브는 언어/알림/기본메뉴 중심.

### 4-2. UI/UX 차이
- [DIFF] 웹은 라이트/다크 테마 전환과 고밀도 인터랙션이 성숙, 네이티브는 라이트 중심 스타일.
- [DIFF] 웹은 모달 중심(작성/검색/알림/메시지), 네이티브는 페이지 전환 중심.
- [DIFF] 웹 카드 밀도와 정보량이 더 높고, 네이티브는 운영 안정화를 위한 간결형 카드 구조.

## 5) 테스트용 샘플 연결 결과 (오류 없는 구간)

### 5-1. 신규 샘플 소스
- `src/mock/menuSamples.ts` 추가

### 5-2. 샘플 연결 적용 메뉴
- Messages: `messageRoomSamples` 연결
- Notifications: `notificationSamples` 연결
- Activity: `activitySamples` 연결
- Explore: API 빈값 시 `exploreSampleCards` 폴백
- Location: API 빈값 시 `exploreSampleCards` 폴백
- Search: API 빈값 시 `exploreSampleCards` 폴백
- Resorts: API 빈값 시 `resortSampleCards` 폴백

### 5-3. 확인 포인트
- [x] 리조트 API 0건 환경에서도 UI 비어있지 않음
- [x] 탐색/위치/검색이 데이터 비어도 테스트 가능한 샘플 유지
- [x] 샘플 연결 변경 파일 ESLint 통과

## 6) 현재 블로커(수정 제외, 보고용)

- `npm run lint` 실패 원인: 웹/캐패시터 의존 모듈 미설치 (`lucide-react`, `@heroicons/react`, `@capacitor/*`, `@googlemaps/markerclusterer`, `react-easy-crop` 등)
- `npm run build:web` 실패 원인: PostCSS `autoprefixer` 누락
- `npx tsc --noEmit` 실패 원인: 백업 디렉토리(`src.bak.*`) 포함 타입오류 + 웹 의존성 누락 + 일부 타입 정의 충돌

