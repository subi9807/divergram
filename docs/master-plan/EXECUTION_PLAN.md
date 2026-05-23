# Divergram Expansion Execution Plan

## 0) 운영 원칙
- 원문 요구사항 파일: `docs/master-plan/archive/2026-05-22_user_master_requirements_raw.md`
- 전체 체크리스트: `docs/master-plan/MASTER_CHECKLIST.md`
- 진행 로그: `docs/master-plan/status/PROGRESS_LOG.md`
- 완료 기준: 각 체크 항목별 코드/화면/테스트 증빙이 있어야 `[x]` 처리

## 1) 개발 순서(고정)
1. 모델 정의 + mock data + 설정 메뉴 구조 + DiveLog 관리 UI
2. DiveLog 리스트/상세/편집 + 업로드 mock + 공개범위
3. Stormglass service + 해양날씨 화면 + 위험도 계산
4. 외부 API 동기화 구조 + Garmin/Suunto/Shearwater mock + 변환 로직
5. BLE 구조 + 기기 검색/연결/동기화 mock + Adapter 패턴
6. Cloudinary + FCM + Instagram 공유
7. OpenAI 요약/캡션/위험도 설명
8. 실 API 키 연결 + 권한/에러/로딩/예외 + 최종 테스트

## 2) 트랙 분리
- App Core: 지도/로그/설정/권한/UI
- Integrations: Stormglass, Garmin/Suunto/Shearwater, BLE, Cloudinary, FCM, OpenAI
- Legal & Policy: 정책 문서, 동의 플로우, 신고/제재, 계정삭제
- QA: 예외 시나리오, 회귀 테스트, 상태 점검표

## 3) 우선 착수 범위 (현재)
- Phase 1 전체
- 폴더 구조 생성
- 모델/서비스/스크린 기본 스캐폴드
- 설정 메뉴 진입 경로 추가
- DiveLogManagementScreen 라우팅 연결

## 3-1) 다음 구현 우선순위 (확정)
1. DiveLogEditScreen: 미디어(mock), 공개범위, 저장/이탈 확인 모달 완성
2. MarineWeatherScreen + Stormglass 실제 호출 구조(.env 기반) + 캐시/fallback
3. IntegrationSettingsScreen + Garmin/Suunto/Shearwater 연결/동기화 상태 흐름
4. BLE Device Screen + Adapter 확장(기기별 mock 분리)
5. 법적 문서 화면/동의 플로우 뼈대 구성

## 3-2) 완료 반영 (2026-05-22)
1. DiveLog 편집 저장/이탈확인/공개범위 처리 완료
2. Stormglass 서비스 실호출 구조 + 캐시/fallback 반영
3. 외부 연동 상태 스토어 + 동기화 실패 로그 반영
4. 정책 문서 25종 + 정책 센터/상세 화면 반영
5. 회원가입 동의 화면 + 동의 이력 저장 구조 반영
6. 외부 연동 API 후보 엔드포인트 + 토큰 refresh 로직 반영
7. Cloudinary signed upload/FCM 토큰 등록 API 경로 반영
8. 정책 재동의 자동 게이트 + 계정삭제 요청형 흐름 반영

## 4) 상태 표기
- `[ ]` 대기
- `[~]` 진행중
- `[x]` 완료
- `[!]` 블로킹
