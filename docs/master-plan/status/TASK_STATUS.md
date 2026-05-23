# Divergram Task Status Board

- Updated: 2026-05-23
- Source of truth (원문 보존): `docs/master-plan/archive/2026-05-22_user_master_requirements_raw.md`
- Full checklist (누락 방지): `docs/master-plan/MASTER_CHECKLIST.md`
- Status update rule: 구현 근거(코드/화면/테스트) 확인 후에만 상태를 변경한다.
- Status legend: `[ ]` pending, `[~]` in progress, `[x]` done, `[!]` blocked

## 0) 기반 문서/운영
- [x] 원문 요구사항 전문 저장
  - Evidence: `docs/master-plan/archive/2026-05-22_user_master_requirements_raw.md`
- [x] 전체 체크리스트 생성
  - Evidence: `docs/master-plan/MASTER_CHECKLIST.md`
- [x] 실행 플랜 문서 생성
  - Evidence: `docs/master-plan/EXECUTION_PLAN.md`

## 1) 1단계 (모델 + Mock + 설정 메뉴 + DiveLog 관리 UI)
- [x] 모델 정의
  - Evidence: `src/models/index.ts`, `src/models/DiveLog.ts`, `src/models/ExternalDiveLog.ts`, `src/models/DivePoint.ts`, `src/models/MarineWeather.ts`, `src/models/DiveDevice.ts`, `src/models/DeviceInfo.ts`, `src/models/Certification.ts`, `src/models/UserIntegration.ts`, `src/models/NotificationSetting.ts`, `src/models/MediaFile.ts`, `src/models/Consent.ts`, `src/models/PolicyDocument.ts`, `src/models/Report.ts`, `src/models/ModerationAction.ts`, `src/models/LegalAgreement.ts`
- [x] mock data 생성
  - Evidence: `src/mock/divergramExpansionMock.ts`
- [x] 설정 화면 메뉴 구조 추가
  - Evidence: `app/(tabs)/settings.tsx`, `src/locales/ko.json`, `src/locales/en.json`, `src/locales/ja.json`, `src/locales/zh.json`
  - Note: 계정 탭에 프로필 설정/외부 연동/DiveLog 관리 바로가기 포함, 다이빙/앱/안전 탭 구조 연결 완료.
  - Note: `settings?tab=...` 딥링크로 탭 직접 진입 지원(`account|notifications|privacy|diving|app|safety`).
  - Note: 계정 탭 `로그인 기기 관리`를 `다이빙 컴퓨터 관리`로 정정하고 진입 경로를 Bluetooth 기기 관리 화면으로 통합.
  - Note: 계정삭제 CTA를 계정 탭 강조 행에서 제거하고 앱 정보 하단의 저강도 텍스트 링크(`다이버그램 계정탈퇴`)로 이동.
  - Note: 다이빙 설정에서 `다이빙 타입` 항목을 제거하고 `단위 설정`(수심/수온/기체) 단일 진입으로 통합, 앱 설정 `다크모드`를 `시스템/다크/라이트` 3모드 선택형으로 전환.
  - Note: 약관/정책/고객지원 메뉴를 설정 앱탭에서 분리하고, 우상단 햄버거 메뉴 하단 `앱 정보` 화면으로 이동해 관리하도록 재구성.
  - Note: 알림 탭의 `알림 세부 설정` 설명 문구를 실제 노출 항목(날씨/동기화) 기준으로 정정해 정보 불일치를 제거.
  - Note: 하단메뉴 후보에서 `저장됨`을 제거하고(`BottomTabRoute`/candidates), 앱 설정 탭의 `앱 버전 확인` 항목을 제거해 메뉴 중복/불필요 항목을 축소.
  - Note: 홈/로그 명칭을 `피드`/`로그 작성`으로 통일하고(`tabs.home`, `tabs.logs`), 상단 햄버거 메뉴 라우트는 중복 제거 로직(`uniqueRouteIds`)으로 섹션 간 중복 노출을 방지.
  - Note: 레거시 `/(tabs)/devices` 경로를 `/(tabs)/bluetooth-devices`로 리다이렉트해 다이빙 컴퓨터 관리 진입 경로를 단일화하고, 탭 라벨(`tabs.devices`)을 다국어 기준 `다이빙 컴퓨터` 계열로 통일.
  - Note: 일부 환경에서 리다이렉트 전환 에러를 방지하기 위해 `/(tabs)/devices`는 `BluetoothDeviceScreen` 직접 렌더링 방식으로 안정화.
- [x] DiveLog 관리 화면 UI 생성
  - Evidence: `src/screens/dive-log/DiveLogManagementScreen.tsx`, `src/components/IntegrationStatusCard.tsx`, `src/components/DiveLogCard.tsx`, `src/components/SyncStatusBadge.tsx`
  - Note: `DiveLog 관리` 화면을 로그 검토/편집 중심으로 단순화하고 서비스 연동/전체 동기화 액션을 기기관리 화면으로 분리.

## 2) 2단계 (DiveLog 리스트/상세/편집)
- [x] DiveLog 리스트/상세/편집 화면 골격 구현
  - Evidence: `src/screens/dive-log/DiveLogDetailScreen.tsx`, `src/screens/dive-log/DiveLogEditScreen.tsx`, `app/(tabs)/dive-log-detail.tsx`, `app/(tabs)/dive-log-edit.tsx`
- [x] 가져온 로그 목록에서 상세 화면 진입
  - Evidence: `src/screens/dive-log/DiveLogManagementScreen.tsx` (`router.push` to detail)
- [x] 상세 편집 저장 후 상세 화면 반영
  - Evidence: `src/stores/diveLogStore.ts`, `src/screens/dive-log/DiveLogEditScreen.tsx`, `src/screens/dive-log/DiveLogDetailScreen.tsx`
- [x] 편집 중 이탈 시 저장 확인 모달
  - Evidence: `src/screens/dive-log/DiveLogEditScreen.tsx` (`beforeRemove` listener)
- [x] 사진/영상 업로드 mock 처리
  - Evidence: `src/screens/dive-log/DiveLogEditScreen.tsx` (10개 제한, 업로드 상태표시, 순서 이동, 저장 검증)
  - Note: 편집 필드 확장(입수/출수 좌표, 시야, 조류 강도) 및 상세 화면 표시 반영.
  - Note: 실제 라이브러리 다중선택(최대 10개), EXIF GPS 자동반영(입/출수 좌표 및 포인트 기본값), 썸네일 미리보기, 실패 업로드 재시도/저장 차단 처리 추가.
  - Note: 실패 업로드 일괄 처리(전체 재시도/실패 항목 삭제) 액션 추가로 저장 전 정리 UX를 단순화.
  - Note: 라이브러리에서 중복 미디어 URI를 자동 제외하고, 선택 상한 초과분/중복 제외 건수를 즉시 안내하며, 업로드중 항목 삭제 시 확인 모달을 추가.
  - Note: 동일 선택 세션 내 중복 URI도 추가 차단(`pickedUriSet`)해 한 번의 다중 선택에서 같은 파일 중복 등록을 방지.
  - Note: 미디어별 `대표 설정` 액션을 추가해 대표 미디어를 원탭으로 목록 맨 앞으로 이동할 수 있도록 개선.
  - Note: 저장 버튼에 선검증(`saveBlockedReason`)을 추가해 필수값 누락/업로드중/실패 상태를 버튼 단계에서 즉시 안내하고, 영상 항목은 재생시간을 표기해 편집 맥락을 강화.
  - Note: 미디어 관리에 `미디어 전체 삭제` 확인 모달을 추가해 재작성 시 대량 정리 시간을 단축.
  - Note: 다이빙 포인트 입력 구간에 `포인트 위치 찾기 (지도)` 버튼을 추가해 무반응 이슈를 해소하고 `/(tabs)/location`으로 즉시 이동하도록 개선.
  - Note: 편집 상태에 `저장되지 않은 변경사항` 배지를 노출하고 `편집 초기화` 액션(마지막 저장 상태 복원)을 추가해 오입력 복구 UX를 보강.
  - Note: 편집 화면 미디어 업로드를 랜덤 mock 성공/실패에서 `cloudinaryService` 기반 실업로드 시도(실패 시 mock fallback)로 전환해 저장 안정성을 향상.
  - Note: 미디어 선택 CTA를 `사진/영상`, `사진만`, `영상만` 3버튼으로 분리하고 업로드 결과에 `cloudinary/mock` 소스 라벨을 노출해 편집/검수 가독성을 개선.
  - Note: DiveLog 관리 화면에 `전체/수동/연동/실패` 필터와 요약 카운트(전체/수동/연동/실패)를 추가해 운영자가 로그 상태를 빠르게 분류/점검하도록 개선.
  - Note: DiveLog 편집 임시저장/복원을 추가해 앱 종료 후 재진입 시 편집 상태를 복원하고, 복원 시 `uploading` 상태 미디어를 `failed`로 전환해 즉시 재시도 가능하도록 안정화.
- [x] 로그 공개 범위 설정 구현 (편집 화면)
  - Evidence: `src/screens/dive-log/DiveLogEditScreen.tsx` (`visibilityType`)
- [x] 수동 로그 가져오기 동작 구현 (mock)
  - Evidence: `src/services/diveLogSyncService.ts` (`importManualDiveLogs`), `src/screens/dive-log/DiveLogManagementScreen.tsx`

## 3) 3단계 (Stormglass + 해양 날씨 + 위험도)
- [x] Stormglass service layer + 위험도 함수 + 캐시/fallback
  - Evidence: `src/services/stormglassService.ts`
  - Note: API Key 없거나 실패 시 캐시/해양정보없음 fallback 처리.
- [x] 해양 날씨 화면 구현 (mock 기반)
  - Evidence: `src/screens/dive-log/MarineWeatherScreen.tsx`, `app/(tabs)/marine-weather.tsx`
- [x] 위험도 계산 고도화(초보자 경고/추천도 포함)
  - Evidence: `src/services/stormglassService.ts` (`calculateMarineRisk`, `buildMarineRiskDescription`), `src/screens/dive-log/MarineWeatherScreen.tsx`
  - Note: 시간대별 추천점수 기반 추천 입수 시간(`bestDiveTimeIso`) 계산/표시 포함.
  - Note: 입수 가능 여부(`diveAllowed`), 비권장 사유(`noDiveReason`), 추천 시간대 윈도우(`bestDiveWindowStartIso`~`bestDiveWindowEndIso`) 및 시간대별 가능여부 표시 추가.
  - Note: 데이터 완성도(`dataCompletenessScore`)와 위험도 신뢰도(`riskConfidence`) 산출/표시 추가.
  - Note: 관측 시간 기준 최근 시각(hour) 우선 평가 및 관측 시각 장기 경과(6h+) 시 안전 가드(신뢰도 low/입수 비권장) 적용.
  - Note: 조석 전환(만/간조) 근접 시간대에 추천점수 보정(`tideTransitionPenalty`)과 경고문을 적용해 리스크 판정 보수성을 강화.
  - Note: 추천 입수 시간 산정 시 `diveAllowed=true` 조건을 강제하고 동점일 때 더 이른 시간 우선으로 안정화.
  - Note: 시간대(hourly) 데이터가 희소한 경우(`hourly<3` 또는 핵심 신호 부족) 신뢰도를 `low`로 강등하고 입수 가능 판단/추천시간 제시를 보류하는 안전 가드 추가.
  - Note: 신선 캐시와 만료 캐시를 분리하고, API 실패/키누락 시 만료 캐시를 보수적 경고(`riskConfidence=low`, `diveAllowed=false`)와 함께 fallback으로 노출.
  - Note: 만료 캐시가 24시간 이상 경과한 경우 위험도를 `danger`로 상향하고 추천점수를 강제 하향해 장기 stale 데이터 의존 리스크를 낮춤.
  - Note: 화면에서 위험도 신뢰도 표시를 한글화(`높음/중간/낮음`)하고 관측 신선도(`최신/보통/지연`, 경과 분) 배지를 추가해 실시간성 판단 근거를 명확히 제공.
  - Note: 시간대별 파고/조류 변동폭(span) 기반 변동성 패널티를 추가해 급변 구간을 위험도/추천점수에 반영하고 관련 경고문을 제공.
  - Note: 초기 3시간 대비 후속 3시간 추천점수 하락 추세를 감지하는 `trendPenalty`를 추가해 단기 악화 예보를 점수/경고에 반영.
  - Note: 관측 시각이 2시간 이상 경과한 경우 추천점수 보정(-8)·신뢰도 강등(high→medium)·추가 경고문을 적용해 준-실시간 데이터의 과신 리스크를 완화.
  - Note: 시간대 예보에서 `위험/비권장` 구간 비중을 계산하는 `horizonRiskPenalty`를 추가해 위험 비율이 높을 때 추천점수 하향·경고·입수 비권장을 강화.

## 4) 4단계 (외부 API 동기화)
- [x] Garmin/Suunto/Shearwater 서비스 + 연결/해제 함수
  - Evidence: `src/services/garminService.ts`, `src/services/suuntoService.ts`, `src/services/shearwaterService.ts`, `src/services/providerTokenService.ts`
- [x] 공통 변환/중복판정/재시도 동기화 로직
  - Evidence: `src/services/diveLogSyncService.ts`, `src/services/externalDiveLogMapper.ts`
- [x] 외부 계정 연결/해제, 동기화 실패/재시도, 마지막 동기화 시간 처리
  - Evidence: `src/stores/integrationStore.ts`, `src/screens/dive-log/DiveLogManagementScreen.tsx`, `src/screens/dive-log/IntegrationSettingsScreen.tsx`
  - Note: 연동 카드 상태 톤/마지막 동기화 포맷/처리중 비활성화 및 read-only 연동 항목 분리 적용.
  - Note: 미연결 공급자 동기화 차단, 전체동기화 시 미연결 항목 자동 스킵 요약, 실패기록 카드별 즉시 재시도 버튼 추가.
  - Note: 연동 상세 화면에서도 미연결 상태 동기화 요청 차단(선연결 유도) 처리 반영.
  - Note: 다이빙 컴퓨터 관리 화면에서 Garmin/Suunto/Shearwater 연동/동기화/전체동기화를 수행하도록 허브 이동.
  - Note: 읽기전용 연동 항목에 `연동 상세 보기` CTA를 추가해 Google Maps/Stormglass/FCM/OpenAI 등 상세 설정 진입 동선을 복구.
  - Note: 연동 설정 상단에 연결/조치필요/처리중 요약 카드(`연동 요약`)를 추가해 운영자가 상태를 빠르게 파악하도록 개선.
  - Note: 연동 목록에 `조치 필요만 보기` 필터를 추가해 운영 이슈 항목만 빠르게 점검하도록 UX를 보강.
  - Note: 연동 목록을 우선순위 정렬(실패 → 미연결 관리형 → 처리중 → 조치필요 → 정상)로 재배치해 운영 대응 순서를 화면에 반영.
  - Note: 연동 요약에 `실패/계정연결 필요` 지표를 분리 표기해 우선 조치 범위를 즉시 식별하도록 개선.
  - Note: 연동 설정 상단에 최근 실패 로그(최대 3건)와 `기록 비우기` 액션을 추가해 장애 원인 파악/정리를 화면 내에서 완료하도록 보강.
  - Note: 연동 요약 카드에 `다이빙 컴퓨터 관리`, `DiveLog 관리` 빠른 이동 버튼을 추가해 운영자 동선을 1단계 단축.
  - Note: 연동 요약 카드에 `실패 항목 재요청` 일괄 액션을 추가해 실패 상태(관리형 연동·연결됨) 항목을 한 번에 `동기화 재요청됨`으로 전환하도록 UX를 안정화.
  - Note: 동일 오류가 반복될 때 2분 이내 중복 실패 로그를 병합해(`markSyncFailure`) 연동 실패 이력 스팸을 억제.
  - Note: 연동 카드에 `동기화 경과`(분/시간/일) 배지를 추가하고, 요약 카드에 `장기 미동기화(24h+)` 집계를 노출해 운영 점검 우선순위를 강화.
  - Note: 연동 설정에 `장기 미동기화만 보기(24h+)` 필터를 추가해 stale 항목만 빠르게 추출할 수 있도록 점검 UX를 보강.
  - Note: 연동 설정 화면에 `연동 상태 점검` 진단 액션을 추가해 Cloudinary 서명 API/FCM 설정 API/Instagram 설치 상태를 실점검하고 카드 상태(`connected/statusMessage/lastSyncAt`)에 즉시 반영.
  - Note: 연동 요약 카드에 `연동 진단 최신 시각`을 노출해 운영자가 마지막 실점검 시점을 빠르게 확인하도록 개선.

## 5) 5단계 (Bluetooth BLE)
- [x] BLE service + adapter 인터페이스/브랜드 어댑터 골격
  - Evidence: `src/services/bluetoothDiveService.ts`, `src/services/diveComputerAdapter.ts`
- [x] Bluetooth 기기 관리 화면 + 스캔/동기화 mock
  - Evidence: `src/screens/dive-log/BluetoothDeviceScreen.tsx`, `app/(tabs)/bluetooth-devices.tsx`
- [x] Garmin/Suunto/Shearwater 전용 BLE adapter 구현
  - Evidence: `src/services/diveComputerAdapter.ts` (`GarminBluetoothAdapter`, `SuuntoBluetoothAdapter`, `ShearwaterBluetoothAdapter`)
- [x] 기기 검색/연결/로그 다운로드 플로우 완성 (mock protocol)
  - Evidence: `src/services/bluetoothDiveService.ts` (`scanDiveComputers`, `connectDiveComputer`, `syncDiveLogsByBluetooth`), `src/screens/dive-log/BluetoothDeviceScreen.tsx`
  - Note: 다중 기기 등록(브랜드별 복수 허용), 데이터 형식 체크, 마지막 동기화 기준 증분 필터(`lastSyncedAt`/`lastSyncExternalLogIds`) 반영.
  - Note: 전체 동기화 시 서비스/기기별 개별 알림 스팸을 억제하고 1회 요약 알림으로 통합, 중복판정용 `lastSyncExternalLogIds`를 가져온 전체 로그 기준으로 누적 저장하여 재동기화 중복 유입을 추가 완화.
  - Note: 전체 동기화 실행 전 `동기화 대상 없음` 가드를 추가하고, 상단에 연동/등록/대상 개수 요약을 표시해 운영자 판단을 지원.

## 6) 6단계 (Cloudinary + FCM + Instagram)
- [x] Cloudinary signed upload + fallback
  - Evidence: `src/services/cloudinaryService.ts`, `src/lib/api.ts`
  - Evidence: `prod-server:/home/divergram/api/server/routes/media.js` (`POST /api/media/cloudinary/sign-upload`, `POST /api/media/cloudinary/delete`)
  - Note: `DiveLogEditScreen`에서 선택 미디어 업로드 시 `uploadImage/uploadVideo`를 즉시 호출하도록 연결(실패 시 fallback URL 사용).
  - Note: Cloudinary 미디어 삭제 API(`deleteCloudinaryMedia`)를 추가하고 DiveLog 편집 화면에서 개별/전체 미디어 삭제 시 실업로드 미디어를 백엔드 서명 삭제 경로로 정리하도록 연결.
- [x] Notification service 확장 (설정 조회/저장 + 토큰 등록 + 테스트 전송 API 경로)
  - Evidence: `src/services/notificationService.ts`, `src/lib/notifications.ts`, `src/lib/api.ts`
- [x] 알림 상세 설정 화면(mock)
  - Evidence: `src/screens/dive-log/NotificationSettingsScreen.tsx`, `app/(tabs)/notification-settings.tsx`
  - Note: 상세 알림 목록에서 `자격증 인증 상태`, `Bluetooth 연결 오류` 항목 제거(미노출) 및 전체 토글 계산을 노출 항목 기준으로 재정렬.
  - Note: 동기화 알림 3종(`dive_schedule`, `sync_complete`, `sync_failed`)을 그룹 동기화 처리해 토글 상태가 서로 어긋나지 않도록 안정화.
- [x] Instagram 공유 service 골격
  - Evidence: `src/services/instagramShareService.ts`
  - Note: 피드 공유 액션(`src/features/feed/FeedPost.tsx`)에서 `shareToInstagramFeed`를 사용하도록 연결해 앱 미설치 시 시스템 공유 fallback 안내까지 동작하도록 개선.
  - Note: `isInstagramShareAvailable`를 노출해 연동 설정 화면의 공유 가능 상태 진단에 재사용.
- [x] 외부 서비스 연동 상태 화면(mock)
  - Evidence: `src/screens/dive-log/IntegrationSettingsScreen.tsx`, `app/(tabs)/integration-settings.tsx`
- [~] 실 업로드/푸시/공유 연동 완료
  - Evidence: `scripts/test-prod-api-integration.sh` + `2026-05-23` 실행 결과 (`NOTI_GET/PATCH=200`, `PUSH_TEST=200`, `CLOUDINARY_SIGN/DELETE=503 cloudinary_not_configured`)
  - Note: 업로드/푸시/공유 API 경로는 운영서버 기준 동작 검증 완료. 실제 전송은 운영 키(Cloudinary/Push provider) 설정 후 활성화된다.

## 7) 7단계 (OpenAI)
- [~] AI service 연동 + 실패 fallback
  - Evidence: `src/services/aiService.ts`
- [x] AI 설정 화면(mock)
  - Evidence: `src/screens/dive-log/AISettingsScreen.tsx`, `app/(tabs)/ai-settings.tsx`
- [~] 실 API 연동 + 실패 fallback + 설정 ON/OFF 연동
  - Evidence: `src/services/aiService.ts`, `src/screens/dive-log/AISettingsScreen.tsx`, `src/stores/settingsStore.ts`, `src/screens/dive-log/DiveLogEditScreen.tsx`, `src/screens/dive-log/MarineWeatherScreen.tsx`
  - Note: AI 설정 토글을 전역 저장소로 영속화하고, DiveLog 편집 저장 시 `aiSummary/aiCaption` 생성과 해양날씨 화면의 AI 위험도 설명 노출에 ON/OFF를 실제 반영.

## 8) 라우팅/사이트맵
- [x] DiveLog 관련 라우트 및 사이트맵 경로 추가
  - Evidence: `app/(tabs)/_layout.tsx`, `src/config/sitemap.ts`, `app/(tabs)/dive-log-management.tsx`
- [x] 확장 화면 라우트 추가 (연동/날씨/Bluetooth/자격증/알림상세/AI)
  - Evidence: `app/(tabs)/integration-settings.tsx`, `app/(tabs)/marine-weather.tsx`, `app/(tabs)/bluetooth-devices.tsx`, `app/(tabs)/certifications.tsx`, `app/(tabs)/notification-settings.tsx`, `app/(tabs)/ai-settings.tsx`
  - Note: `/(tabs)/app-info` 라우트 추가, `appRouteMap.app_info` 및 햄버거 메뉴(`DgTabHeader`) 연결 완료.
  - Note: 탐색/프로필 그리드를 3열·15개 기본·하단 스크롤 페이지네이션으로 통일(`app/(tabs)/explore.tsx`, `app/(tabs)/profile.tsx`), 포인트지도는 Google Map에 포인트/리조트 2종 마커를 동시 표기(`app/(tabs)/location.tsx`).

## 9) 법적 문서/동의/신고 시스템
- [x] 정책 문서 전문 작성 (25종)
  - Evidence: `src/legal/policyCatalog.ts`
- [x] 정책 화면 구현
  - Evidence: `src/screens/legal/*.tsx`, `app/(tabs)/terms-policy.tsx`, `app/(tabs)/privacy-policy.tsx`, `app/(tabs)/location-policy.tsx`, `app/(tabs)/community-policy.tsx`, `app/(tabs)/safety-disclaimer.tsx`, `app/(tabs)/ai-usage-policy.tsx`, `app/(tabs)/policy-document.tsx`, `app/(tabs)/policy-center.tsx`
- [x] 회원가입 동의 UI + 동의이력 저장 구조
  - Evidence: `src/screens/legal/ConsentScreen.tsx`, `app/(auth)/consent.tsx`, `src/stores/legalStore.ts`, `src/services/policyService.ts`, `src/services/signupFlowService.ts`
- [x] 정책 버전 재동의 자동 감지 및 재동의 경로
  - Evidence: `app/(tabs)/_layout.tsx`, `src/screens/legal/ConsentScreen.tsx`, `src/stores/legalStore.ts`
- [x] 신고/제재 UI 및 모델/상태 처리
  - Evidence: `src/screens/legal/ReportScreen.tsx`, `app/(tabs)/report.tsx`, `src/stores/legalStore.ts`, `src/models/Report.ts`, `src/models/ModerationAction.ts`
  - Note: 신고 입력 검증 강화(대상ID/상세설명/연속제출 제한), 신고 미리보기/최근 신고이력, 상태 워크플로우(접수→검토→처리 mock), API 저장 경로 일원화(`submitModerationReport`) + 대상타입 화이트리스트 검증.
  - Note: 동일 사용자/동일 대상/동일 사유 10분 이내 중복 신고 차단(`duplicate_report_recent`) 및 사용자 안내 메시지 매핑 추가.
  - Note: 신고 사유 화이트리스트 검증(`invalid_report_reason`) 및 신고대상 변경 시 targetId 초기화 처리 반영.
  - Note: 신고 대상 타입별 ID placeholder/길이/공백 검증 및 상세설명 필수사유 inline 에러 표시로 제출 전 검증을 강화.
  - Note: 로컬 신고 이력 기준 동일 사용자/대상/사유 10분 이내 재제출 사전 차단(`validateBeforeSubmit`)을 추가해 API 호출 전 중복 제출을 억제.
  - Note: 상세 설명 1000자 상한과 실시간 카운터를 추가하고, 공통 사유에서도 길이 초과 시 inline 에러를 표시해 입력 단계 품질을 보강.
  - Note: 신고 사유별 최소 상세 길이 규칙을 분리(`detailMinLengthByReason`)해 사유별로 상이한 검증(예: 저작권/위험행위)을 적용.
  - Note: 상세설명 품질 검증(`validateDetailQuality`)을 추가해 무의미 문자 입력을 차단하고, 저작권 사유는 링크 또는 충분한 설명 길이를 요구하도록 강화.
  - Note: 대상 ID에 허용 문자셋 검증(`^[A-Za-z0-9_:\\-]+$`)을 추가해 잘못된 포맷 입력을 제출 전에 차단.
  - Note: 중복 신고 판정 시 대상 ID를 대소문자/공백 정규화(`normalizeTargetId`)해 동일 대상을 우회 형태로 재신고하는 케이스를 차단.
  - Note: 과도한 동일문자 반복 입력 차단과 24시간 신고 건수 상한(20건) 검증을 추가해 남용 패턴을 완화.
  - Note: 대상 ID 최대 길이(64자)와 동일 대상 연속 신고 30초 쿨다운을 추가해 자동화/과다 제출 패턴을 추가 완화.
  - Note: `사용자` 대상 신고에서 본인 계정 ID를 신고 대상으로 제출하는 케이스를 사전 차단해 잘못된 자가 신고 입력을 방지.
  - Note: 신고 API 실패(네트워크/5xx/타임아웃 계열) 시 로컬 신고 저장분을 유지하고 `동기화 대기` 안내로 전환해 신고 유실을 방지.
  - Note: 저장소 레벨 중복 신고 검증(`submitReport`)에서 대상 ID를 소문자 정규화해 대소문자 우회 중복 신고를 차단.

## 10) 자격증 관리
- [x] 자격증 관리 화면(mock)
  - Evidence: `src/screens/dive-log/CertificationScreen.tsx`, `app/(tabs)/certifications.tsx`
- [~] PADI/SSI 실등록 + 이미지 업로드 + 검증 상태 워크플로우
  - Evidence: `src/services/certificationService.ts`, `src/screens/dive-log/CertificationScreen.tsx`, `src/services/cloudinaryService.ts`
  - Note: 앱 내 등록 폼(기관/레벨/번호/발급일/만료일) + 이미지 업로드 + 상태 전이(`reviewing→verified/rejected`, mock)를 구현. 운영 API/관리자 검수 백엔드 연동은 잔여.

## 11) 검증
- [x] 신규 변경 파일 대상 eslint 검증
  - Evidence: local command run (`npx eslint ...`) passed for touched files
  - Note: `src/providers/AuthProvider.tsx` 시작 로딩 구간 개선 반영 후 lint 통과(캐시 세션 존재 시 즉시 화면 노출, 서버 검증 백그라운드 진행).
- [x] 운영 API 스모크 테스트(지원/미지원 엔드포인트 상태 확인)
  - Evidence: local `curl` checks (`/api/health`, `/api/auth/oauth/providers`, `/api/auth/oauth/mobile`, `/api/push/tokens`, `/api/media/cloudinary/sign-upload`, `/api/auth/account/delete-request`, `/api/notifications/settings`, `/api/auth/refresh`)
- [!] 전체 tsc 검증은 기존 레거시/웹 백업 코드 오류로 블로킹
  - Evidence: local command run (`npx tsc --noEmit`) failed in unrelated files (`src/`, `src.bak.*`, `capacitor` related)
- [~] 통합 시나리오 테스트 (로그 연동, BLE, 날씨, AI, 설정)
  - Evidence: `scripts/test-prod-api-integration.sh` (인증 생성→알림설정 조회/저장→푸시 테스트→Cloudinary 서명/삭제→OAuth providers/mobile 실패 경로 검증)
  - Note: 외부 키 미제공 항목(Cloudinary 실제 업로드, FCM/APNS 발송, 외부 API 실데이터)은 환경키 연결 후 최종 E2E 재검증이 필요.

## 12) 운영 API 정합화 (2026-05-23)
- [x] 운영 서버 실 라우트 재확인(SSH) 및 앱 API 경로 정합화
  - Evidence: `src/lib/api.ts` (prod 지원 라우트 우선 + 불필요 후보 제거)
- [x] 미지원 엔드포인트 fail-fast 처리 + 404/405/501 경로 캐시
  - Evidence: `src/lib/api.ts` (`unsupportedRouteCache`, `createUnsupportedFeatureError`)
- [x] Google OAuth 로그인 경로 모바일 우선 fallback 정리
  - Evidence: `src/lib/api.ts` (`authWithOAuth`, `authWithOAuthMobile`)
- [x] 계정삭제 미지원 서버에서 오동작(강제 로그아웃) 방지
  - Evidence: `app/(tabs)/settings-detail.tsx` (삭제 성공시에만 로그아웃)
- [x] 계정삭제 API 미지원 fallback 요청 경로 반영 (`reports` 저장)
  - Evidence: `src/lib/api.ts` (`requestAccountDeletion` → `/api/data/reports`)

## 13) 운영 백엔드 확장 (SSH: prod-server)
- [x] 외부 서비스 연동 API 라우트 추가 (`connect/refresh/disconnect/logs`)
  - Evidence: `prod-server:/home/divergram/api/server/routes/integrations.js`
  - Evidence: `prod-server:/home/divergram/api/server/index.js` (`registerIntegrationRoutes`)
- [x] 알림 설정/푸시 테스트 API 라우트 추가
  - Evidence: `prod-server:/home/divergram/api/server/routes/notificationSettings.js`
  - Evidence: `prod-server:/home/divergram/api/server/index.js` (`registerNotificationSettingsRoutes`)
- [x] Cloudinary 서명 업로드 API 라우트 추가
  - Evidence: `prod-server:/home/divergram/api/server/routes/media.js`
  - Evidence: `prod-server:/home/divergram/api/server/index.js` (`registerMediaRoutes`)
  - Note: Cloudinary 삭제 라우트(`POST /api/media/cloudinary/delete`)를 추가해 앱에서 업로드된 미디어를 signed destroy 방식으로 정리 가능하도록 확장.
- [x] 앱 API 클라이언트의 prod 차단 가드 해제(신규 백엔드 라우트 사용)
  - Evidence: `src/lib/api.ts` (`connectExternalProvider`, `refreshExternalProviderToken`, `disconnectExternalProvider`, `getExternalProviderDiveLogs`, `requestCloudinarySignedUpload`, `getNotificationSetting`, `updateNotificationSetting`, `sendPushTest`)
- [x] 운영 스모크 검증(인증 포함)
  - Evidence: `https://api.divergram.com/api/integrations/garmin/connect` `200`
  - Evidence: `https://api.divergram.com/api/integrations/garmin/logs?limit=2` `200`
  - Evidence: `https://api.divergram.com/api/notifications/settings` `GET/PATCH 200`
  - Evidence: `https://api.divergram.com/api/push/test` `200`
  - Evidence: `https://api.divergram.com/api/media/cloudinary/sign-upload` `503 cloudinary_not_configured` (키 미설정 정상)
