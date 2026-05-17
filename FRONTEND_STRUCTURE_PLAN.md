# Frontend Structure Plan

## 현재 문제
- App.tsx에 라우팅/제스처/히스토리/모달 상태가 집중됨
- 기능별 상태와 UI 렌더가 강결합

## 분리 목표
1. routing/useRouteState.ts
   - pathname <-> currentPage 매핑
   - pushState/popstate 처리
2. gestures/useEdgeSwipeNav.ts
   - 모바일 좌우 엣지 스와이프 뒤로/앞으로
3. overlays/useModalState.ts
   - create/search/notifications/messages/edit-profile 모달 상태
4. AppShell.tsx
   - 상단 3개 hook 조합 + 화면 렌더 스위치만 담당

## 단계별 적용
- Step A: useRouteState 추출
- Step B: useModalState 추출
- Step C: useEdgeSwipeNav 추출
- Step D: App.tsx -> AppShell 경량화

## 완료 조건
- 기존 라우트 동작 동일
- 모바일 네비/릴스 동작 동일
- build 성공
