# Divergram Phase 1 실행안 (현재 코드베이스 기준)

## 목표
- 대형 프롬프트의 전체 범위 중 "지금 바로 가능한 단계"만 실행
- 1차 대상: MVP 범위 고정 + IA 정렬 + 인증 안정화 우선순위

## A. MVP 범위 고정 (실행 대상)
- 포함
  - Authentication (Email, Google 우선)
  - Home Feed
  - Explore
  - Dive Map(현 `location` 화면)
  - Dive Log Creation(현 `logs`)
  - Profile
  - Media Upload(포스트/로그 이미지 우선)
  - Resort Search
- 제외(2차)
  - Live streaming
  - Marketplace
  - Subscription
  - Advanced AI

## B. IA 1차 반영 (완료)
- 하단 탭을 아래 5개로 정렬
  - Home (`/(tabs)` -> feed)
  - Explore (`/(tabs)/explore`)
  - Map (`/(tabs)/location`)
  - Logbook (`/(tabs)/logs`)
  - Profile (`/(tabs)/profile`)
- `messages`는 상단 메뉴에서 접근 가능하도록 이동
- 반영 파일
  - `app/(tabs)/_layout.tsx`
  - `src/config/sitemap.ts`
  - `src/components/DgTabHeader.tsx`

## C. 인증 안정화 우선순위 (진행 시작)

### C1. 우선순위 P0
1) Email 로그인/세션/로그아웃 무결성
2) Google 로그인 복구 (현재 400 이슈)
3) 탭 영역 인증 가드 유지

### C2. 이번 반영(완료)
- Expo 런타임에서 읽을 수 있도록 Google Client ID를 `EXPO_PUBLIC_*` 우선 사용
- Google Client ID 누락 시 즉시 오류 반환(조기 실패)
- 반영 파일
  - `src/providers/AuthProvider.tsx`
  - `.env`
  - `.env.example`

### C3. 다음 작업(즉시 착수 후보)
- Google OAuth 요청 방식 점검
  - redirect URI/response type/클라이언트 타입(iOS/Android/Web) 정합성
- 토큰 만료/재로그인 UX 정리
- OAuth 콜백 화면(`/(auth)/callback/*`)의 중복 로그인 호출 구조 개선

## D. 작업 티켓 (실행 순서)

1) DG-P1-IA-001 [done]
- 제목: Bottom Nav 5탭 IA 정렬
- 인수기준: 탭이 Home/Explore/Map/Logbook/Profile 순서로 노출

2) DG-P1-IA-002 [done]
- 제목: Messages 접근 경로 이관
- 인수기준: 상단 메뉴에서 Messages 진입 가능

3) DG-P1-AUTH-001 [done]
- 제목: Google Client ID 런타임 주입 표준화
- 인수기준: `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*` 사용, 누락 시 조기 오류

4) DG-P1-AUTH-002 [todo]
- 제목: Google 400 오류 원인 확정 및 수정
- 인수기준: iOS 시뮬레이터에서 Google 로그인 성공 후 feed 이동

5) DG-P1-AUTH-003 [todo]
- 제목: OAuth 콜백 플로우 정리
- 인수기준: 콜백 화면에서 불필요한 provider 재호출 제거, 에러 분기 표준화

## E. 현재 리스크
- Google OAuth 400 오류는 클라이언트 ID 주입 외에 redirect_uri/flow 정합성 이슈가 남아있을 수 있음
- messages/notifications/activity/reels는 일부가 샘플 데이터 기반

## F. 다음 즉시 실행 제안
- DG-P1-AUTH-002부터 진행: Google 400 복구를 우선 처리
