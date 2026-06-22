# Divergram Native App 현재 사이트맵/기능 명세 (2026-05-19)

## 1) 전체 라우팅 구조 (현행)

- `/` (`app/index.tsx`): 세션 상태에 따라 자동 리다이렉트
  - 로그인 세션 있음: `/(tabs)`
  - 로그인 세션 없음: `/(auth)/welcome`

- `/(auth)` 그룹 (`app/(auth)/_layout.tsx`)
  - `/(auth)/welcome`
  - `/(auth)/login`
  - `/(auth)/privacy`
  - `/(auth)/terms`
  - `/(auth)/callback/*`
    - `/(auth)/callback/google`
    - `/(auth)/callback/apple`
    - `/(auth)/callback/facebook`
    - `/(auth)/callback/kakao`
    - `/(auth)/callback/naver`

- `/(tabs)` 그룹 (`app/(tabs)/_layout.tsx`)
  - 하단 탭 노출(5개)
    - `/(tabs)` (`index` -> `feed`)
    - `/(tabs)/explore`
    - `/(tabs)/location`
    - `/(tabs)/logs`
    - `/(tabs)/profile`
  - 탭바 비노출(내부 이동 화면)
    - `/(tabs)/create` (`logs` 리다이렉트)
    - `/(tabs)/messages`
    - `/(tabs)/feed`
    - `/(tabs)/search`
    - `/(tabs)/notifications`
    - `/(tabs)/reels`
    - `/(tabs)/resorts`
    - `/(tabs)/location`
    - `/(tabs)/saved`
    - `/(tabs)/activity`
    - `/(tabs)/account`
    - `/(tabs)/admin`
    - `/(tabs)/post`
    - `/(tabs)/report`
    - `/(tabs)/profile-edit`
    - `/(tabs)/devices`
    - `/(tabs)/settings`
    - `/(tabs)/logs`

- 기타
  - `+not-found`

## 2) 글로벌 동작 규칙

- 인증 가드: `app/(tabs)/_layout.tsx`
  - `loading=true`면 로딩 인디케이터
  - `user=null`이면 `/(auth)/login`으로 강제 이동
- Auth 상태 소스: `src/providers/AuthProvider.tsx`
  - `storage` 토큰(`auth_token`) 기반 세션 확인
- 앱 공통 Provider: `app/_layout.tsx`
  - React Query, Toast, AuthProvider, i18n 언어 동기화
  - Splash 3초 지연 숨김

## 3) 페이지별 기능 명세

| 화면 | 경로 | 파일 | 핵심 기능 | 데이터 소스/연동 | 상태 |
|---|---|---|---|---|---|
| 루트 진입 | `/` | `app/index.tsx` | 세션 기반 분기 리다이렉트 | `useAuth()` | 운영 가능 |
| 웰컴 | `/(auth)/welcome` | `app/(auth)/welcome.tsx` | 브랜딩 히어로, 로그인/약관/개인정보 링크 | 정적 UI+i18n | 운영 가능 |
| 로그인 | `/(auth)/login` | `app/(auth)/login.tsx` | Google/Apple/Facebook/Kakao/Naver/Email 로그인, 이메일 폼 토글 | `AuthProvider` 로그인 함수 | 부분 운영 (Google 400 이슈 존재) |
| 개인정보 | `/(auth)/privacy` | `app/(auth)/privacy.tsx` | 약관 본문 노출 | i18n 텍스트 | 운영 가능 |
| 이용약관 | `/(auth)/terms` | `app/(auth)/terms.tsx` | 약관 본문 노출 | i18n 텍스트 | 운영 가능 |
| OAuth 콜백(공통) | `/(auth)/callback/*` | `app/(auth)/callback/*.tsx` | 콜백 파라미터 검사 후 provider 로그인 재호출, 성공 시 feed 이동 | `useAuth()`, `useLocalSearchParams()` | 부분 운영 (provider별 안정성 점검 필요) |
| 탭 홈(실체 feed) | `/(tabs)` / `/(tabs)/feed` | `app/(tabs)/index.tsx`, `app/(tabs)/feed.tsx` | 피드 목록, 무한스크롤, pull-to-refresh, 에러/빈 상태 처리 | `useFeed()` -> `apiClient.getFeed()` | 운영 가능 |
| 피드 헤더 | (feed 내부) | `src/features/feed/FeedHeader.tsx` | 검색/알림/작성 이동 버튼, 상단 카드 | 라우팅 이동 | 운영 가능 |
| 피드 카드 | (feed 내부) | `src/features/feed/FeedPost.tsx` | 작성자/이미지/메타정보/좋아요/댓글/공유/저장 UI | 피드 데이터 렌더링 | UI 동작 중심 (액션 API 미연동) |
| 탐색 | `/(tabs)/explore` | `app/(tabs)/explore.tsx` | 검색바 UI, 토픽 필터 UI, 카드 목록 | `apiClient.getExplore()` + 샘플 fallback | 운영 가능(탐색 필터는 UI 중심) |
| 작성(바로가기) | `/(tabs)/create` | `app/(tabs)/create.tsx` | `logs` 화면으로 라우트 alias | 라우팅 | 운영 가능 |
| 로그 작성 | `/(tabs)/logs` | `app/(tabs)/logs.tsx` | 다이브 로그 입력/검증/저장, 저장 성공 시 feed/logs 캐시 무효화 | `apiClient.createLog()`, React Query mutation | 운영 가능 |
| 메시지 | `/(tabs)/messages` | `app/(tabs)/messages.tsx` | 채팅방 목록, unread 집계, 검색 UI | 샘플 데이터(`messageRoomSamples`) | 샘플 기반 |
| 프로필 | `/(tabs)/profile` | `app/(tabs)/profile.tsx` | 유저 카드, 프로필 완성도, bio, 빠른 링크(저장/활동/설정), 프로필 수정 이동 | `useAuth()`, `useProfile()` | 운영 가능 |
| 프로필 수정 | `/(tabs)/profile-edit` | `app/(tabs)/profile-edit.tsx` | 이름/bio 편집 UI, 저장 알림 | 로컬 state only | 플레이스홀더 |
| 설정 | `/(tabs)/settings` | `app/(tabs)/settings.tsx` | 알림 토글, 언어 변경, 계정/활동/신고/디바이스 이동, 앱 정보, 로그아웃 확인/실행 | `useSettingsStore`, `useAuth.logout` | 운영 가능 |
| 저장됨 | `/(tabs)/saved` | `app/(tabs)/saved.tsx` | 저장 포스트 목록 UI | `useFeed()` 앞 8개 슬라이스 | 준운영 (실제 saved 분리 아님) |
| 알림 | `/(tabs)/notifications` | `app/(tabs)/notifications.tsx` | 알림 리스트, 모두 읽음 처리 | 샘플 데이터(local state) | 샘플 기반 |
| 검색 | `/(tabs)/search` | `app/(tabs)/search.tsx` | 키워드 검색 필터 | `apiClient.getExplore()` + 샘플 fallback | 운영 가능(간단 검색) |
| 위치 | `/(tabs)/location` | `app/(tabs)/location.tsx` | 지도 플레이스홀더 + 위치 카드 목록 | `apiClient.getExplore()` + 샘플 fallback | 부분 운영 (실지도 미연동) |
| 리조트 | `/(tabs)/resorts` | `app/(tabs)/resorts.tsx` | 리조트 목록, top/reviewed 필터, 요약 통계 | `apiClient.getResorts()` + 샘플 fallback | 운영 가능 |
| 릴스 | `/(tabs)/reels` | `app/(tabs)/reels.tsx` | 세로 페이징 숏폼 UI, 좋아요/댓글/공유 카운트 표시 | 정적 mock 배열 | 샘플 기반 |
| 활동 | `/(tabs)/activity` | `app/(tabs)/activity.tsx` | 활동 타임라인 카드 | 샘플 데이터(`activitySamples`) | 샘플 기반 |
| 계정 | `/(tabs)/account` | `app/(tabs)/account.tsx` | 계정 기본정보 표시, 이메일/보안 메뉴 UI | `useAuth().user` | 부분 운영 (세부 액션 미구현) |
| 디바이스 | `/(tabs)/devices` | `app/(tabs)/devices.tsx` | BLE 스캔/연결/해제, 실시간 다이브 차트 | `useBle()` (`react-native-ble-plx`) | 부분 운영 (데이터는 mock 스트림) |
| 신고 | `/(tabs)/report` | `app/(tabs)/report.tsx` | 신고 텍스트 입력/제출 UI | 로컬 state + Alert | 플레이스홀더 |
| 게시글 상세 | `/(tabs)/post` | `app/(tabs)/post.tsx` | `post` 쿼리로 단일 포스트 표시 | `useFeed()`에서 대상 검색 | 준운영 |
| 관리자 | `/(tabs)/admin` | `app/(tabs)/admin.tsx` | 접근 제한 안내 UI | 정적 | 플레이스홀더 |
| 404 | `+not-found` | `app/+not-found.tsx` | 없는 라우트 안내, 홈 이동 | 정적 | 운영 가능 |

## 4) 내비게이션/메뉴 구조

- 하단 탭(고정): 홈(feed), 탐색(explore), 포인트 지도(location), 로그북(logs), 프로필(profile)
- 상단 헤더 메뉴(DgTabHeader)
  - Quick: settings, activity, saved
  - More: reels, resorts, location, notifications, admin
- 설정 내부 이동: account, activity, report, devices
- 피드 헤더 빠른 이동: search, notifications, create(logs)

## 5) 현재 정리 기준에서의 핵심 포인트

- 운영 데이터 연동이 명확한 축
  - feed, logs(create), resorts, explore/search/location(탐색성 데이터)
- 샘플/플레이스홀더 축
  - messages, notifications, reels, activity, admin, profile-edit 저장, report 전송
- 인증축
  - 탭 보호는 적용됨
  - Google OAuth는 현재 400 오류 이슈로 별도 수정 필요
