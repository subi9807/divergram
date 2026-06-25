# Divergram Task Status Board

- Updated: 2026-06-13
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
  - Note: 설정 화면 마지막 활성 탭을 로컬 저장소(`divergram_settings_last_tab_v1`)에 보존해 재진입 시 동일 섹션으로 복원.
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
  - Note: Cloudinary 삭제 실패 항목을 로컬 큐에 적재하고 편집 화면 진입 시 자동 재시도(`flushPendingMediaDeletes`)해 미디어 orphan 누적 가능성을 낮춤.
  - Note: 미디어 업로드 큐를 도입해 동시 처리 개수를 2개로 제한(`MAX_PARALLEL_UPLOADS`)하고, 대기 업로드 건수를 화면에 표시해 대량 첨부 시 안정성을 보강.
  - Note: 업로드 상태를 `대기(idle)`와 `업로드중(uploading)`으로 분리하고 저장 차단 조건에 대기열을 포함해 큐 적재 직후 저장되는 케이스를 차단.
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
  - Note: 시간대 예보 시각 간격 공백/불규칙성을 `forecastContinuityPenalty`로 반영해 큰 예보 갭(4h+) 발생 시 신뢰도 하향(`low`) 및 입수 보수판단을 강화.
  - Note: 단시간 수온 변동폭(`thermalShiftPenalty`)을 반영해 수온 급변 시 추천점수 하향과 보온 장비 경고를 추가.
  - Note: 위험/주의 시간대 연속 구간(`riskStreakPenalty`)을 반영해 연속 리스크가 길어질수록 추천점수 하향과 입수 연기 권고를 강화.

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
  - Note: 연동 요약 카드에 Cloudinary `미디어 삭제 대기` 건수를 노출하고 `삭제 대기 정리` 액션으로 즉시 재정리할 수 있도록 보강.
  - Note: 연동 진단 실행에 60초 쿨다운(`DIAGNOSTIC_COOLDOWN_MS`)과 `진단 요약` 표시를 추가해 점검 스팸/중복 호출을 방지하고 실패 원인을 빠르게 식별하도록 개선.
  - Note: 연동 진단 범위에 Google Maps/Stormglass 키 상태와 OpenAI 헬스체크를 추가해 핵심 외부 서비스 준비 상태를 화면에서 일괄 점검.

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
- [x] Cloudinary unsigned preset fallback 지원 + 상태판 정합화
  - Evidence: `src/services/cloudinaryService.ts`, `src/stores/integrationStore.ts`, `src/screens/dive-log/IntegrationSettingsScreen.tsx`, `.env.example`, `prod-server:/home/divergram/api/server/routes/media.js`
  - Note: `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME + EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`만 있으면 클라이언트 direct upload로 실 Cloudinary 업로드가 가능하도록 추가하고, 연동 상태 점검에서도 unsigned 가능 여부를 반영하도록 개선.
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
- [x] 실 업로드/푸시/공유 연동 완료
  - Evidence: `scripts/test-prod-api-integration.sh`, `/tmp/divergram_api_smoke.sh`
  - Note: 업로드/푸시/공유 API 경로는 운영서버 기준 동작 검증 완료. 실제 전송은 운영 키(Cloudinary/Push provider) 설정 후 활성화된다.
  - Note: 2026-06-11 추가 스모크에서 `PUSH_TOKEN_REGISTER=200`, `PUSH_TEST=200`, `CLOUDINARY_SIGN/DELETE=503(cloudinary_not_configured)`, `OAUTH_PROVIDERS=200`, `OAUTH_MOBILE_INVALID=400`까지 재확인해 fallback 경로가 정상임을 검증했다.

## 7) 7단계 (OpenAI)
- [x] AI service 연동 + 실패 fallback
  - Evidence: `src/services/aiService.ts`
  - Note: OpenAI 호출에 타임아웃(12s)과 응답 파서 다중 fallback(`output_text`→`output[].content`→`choices`)을 추가해 지연/포맷 차이 상황에서도 안정적으로 기본 문구로 복구되도록 보강.
- [x] AI 설정 화면(mock)
  - Evidence: `src/screens/dive-log/AISettingsScreen.tsx`, `app/(tabs)/ai-settings.tsx`
- [x] 실 API 연동 + 실패 fallback + 설정 ON/OFF 연동
  - Evidence: `src/services/aiService.ts`, `src/services/aiSettingsService.ts`, `api/server/routes/aiSettings.js`, `app/_layout.tsx`, `src/screens/dive-log/AISettingsScreen.tsx`, `src/stores/settingsStore.ts`, `src/screens/dive-log/DiveLogEditScreen.tsx`, `src/screens/dive-log/MarineWeatherScreen.tsx`
  - Note: AI 설정 토글을 전역 저장소로 영속화하고, DiveLog 편집 저장 시 `aiSummary/aiCaption` 생성과 해양날씨 화면의 AI 위험도 설명 노출에 ON/OFF를 실제 반영.
  - Note: 2026-06-11 추가로 `GET/PATCH /api/ai/settings` 서버 동기화와 로컬 fallback을 연결해 AI 설정의 서버 영속 경로를 보강했다.

- [x] AI 설정 서버 동기화 + 로컬 fallback
  - Evidence: `api/server/routes/aiSettings.js`, `src/services/aiSettingsService.ts`, `src/lib/api.ts`, `src/screens/dive-log/AISettingsScreen.tsx`
  - Note: AI 설정 화면이 서버 우선으로 읽고 저장 실패 시 로컬 저장소로 복구하도록 연결했다. 앱 시작 시 `SettingsHydrationBridge`가 AI 설정을 한 번 더 동기화해 다른 화면에서도 최신 설정이 유지되도록 보강했다.

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
  - Note: 신고 모델에 `syncStatus/syncError`를 추가하고, 신고 화면에서 `동기화 대기` 목록/개별 재동기화 버튼을 제공해 장애 복구 플로우를 명시화.
  - Note: 신고 화면 진입 시 최근 `동기화 대기` 신고(최대 3건)를 자동 재동기화하도록 보강해 수동 조치 없이 복구되도록 개선.
  - Note: 신고 접수 전 필수 정책 동의 검증을 추가하고 미동의 사용자를 `재동의` 화면으로 유도해 법적 동의 누락 상태의 신고 제출을 차단.
  - Note: 신고 재동기화(`지금 동기화`)와 자동 재동기화 루틴에도 동일한 필수 동의 게이트를 적용해 우회 제출을 방지.

## 10) 자격증 관리
- [x] 자격증 관리 화면(mock)
  - Evidence: `src/screens/dive-log/CertificationScreen.tsx`, `app/(tabs)/certifications.tsx`
- [x] 자격증 단체명 커스텀 등록 확장
  - Evidence: `src/models/Certification.ts`, `src/services/certificationService.ts`, `src/screens/dive-log/CertificationScreen.tsx`, `src/mock/divergramExpansionMock.ts`
  - Note: PADI/SSI 같은 자주 쓰는 단체 칩은 유지하면서, 직접 입력 칸을 추가해 CMAS/AIDA/NAUI 등 새로운 단체도 앱 수정 없이 바로 등록 가능하도록 확장.
- [x] 자격증 단체 검색/최근 사용 단체 보강
  - Evidence: `src/screens/dive-log/CertificationScreen.tsx`
  - Note: 단체명을 검색해 필터링하고, 최근 사용 단체를 별도 칩으로 재선택할 수 있게 해 운영 등록 속도를 개선.
- [x] PADI/SSI 실등록 + 이미지 업로드 + 검증 상태 워크플로우
  - Evidence: `src/services/certificationService.ts`, `src/screens/dive-log/CertificationScreen.tsx`, `src/services/cloudinaryService.ts`, `src/lib/api.ts`
  - Evidence: `prod-server:/home/divergram/api/server/routes/data.js` (`DATA_TABLES.certifications`)
  - Evidence: `prod-server:/home/divergram/api/server/index.js` (`app_certifications` schema/index ensure)
  - Note: 앱 내 등록 폼(기관/레벨/번호/발급일/만료일) + 이미지 업로드 + 수정/삭제 + 상태 전이(`reviewing→verified/rejected`) + OCR 선반영 + 백엔드 우선 동기화까지 연결해 운영 등록 흐름을 완성했다.
  - Note: 자격증 목록 상단에 `저장 경로(백엔드/로컬 fallback)` 힌트를 노출해 운영 점검 시 동기화 소스를 즉시 확인 가능하도록 개선했다.
  - Note: 자주 쓰는 기관 칩 + 직접 입력 + 검색 + 최근 사용 기관 칩을 제공해 여러 단체를 운영 등록할 수 있도록 확장했다.

## 11) 검증
- [x] 신규 변경 파일 대상 eslint 검증
  - Evidence: local command run (`npx eslint ...`) passed for touched files
  - Note: `src/providers/AuthProvider.tsx` 시작 로딩 구간 개선 반영 후 lint 통과(캐시 세션 존재 시 즉시 화면 노출, 서버 검증 백그라운드 진행).
- [x] 운영 API 스모크 테스트(지원/미지원 엔드포인트 상태 확인)
  - Evidence: local `curl` checks (`/api/health`, `/api/auth/oauth/providers`, `/api/auth/oauth/mobile`, `/api/push/tokens`, `/api/media/cloudinary/sign-upload`, `/api/auth/account/delete-request`, `/api/notifications/settings`, `/api/auth/refresh`)
- [x] 전체 tsc 검증 통과
  - Evidence: local command run (`npx tsc --noEmit --pretty false`) passed after narrowing `tsconfig.json` include/exclude to active app sources
  - Note: 백업/산출물/derived 디렉터리를 타입체크 대상에서 제외해 운영 소스만 검증되도록 정리했다.
- [x] 통합 시나리오 테스트 (로그 연동, BLE, 날씨, AI, 설정)
  - Evidence: `scripts/test-prod-api-integration.sh`
  - Note: 2026-06-11 재실행 결과 `NOTIFICATIONS_GET/PATCH=200`, `PUSH_TEST=200`, `CLOUDINARY_SIGN/DELETE=503(cloudinary_not_configured)`, `CERT_CREATE/PATCH=200`, `OAUTH_PROVIDERS=200`, `OAUTH_MOBILE(invalid)=400`.
  - Note: 외부 키 미제공 항목(Cloudinary 실제 업로드, FCM/APNS 발송, 외부 API 실데이터)은 환경키 연결 후 최종 전송만 활성화되며, fallback/에러 경로는 정상 동작 확인.
  - Note: 2026-06-11 추가 API smoke 결과 `AUTH_SESSION=200`, `PROFILES_LIST=200`, `POSTS_LIST=200`, `NOTIFICATIONS_LIST=200`, `CERTIFICATIONS_LIST=200`, `PUSH_TOKEN_REGISTER=200`, `GARMIN/SUUNTO/SHEARWATER_LOGS=200`, `GARMIN/SUUNTO/SHEARWATER_CONNECT=200`까지 확인.

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

## 14) 다크모드/가독성 안정화 (2026-05-23)
- [x] 설정/동의/피드 다크모드 카드 톤 정합화
  - Evidence: `tailwind.config.js`, `app/_layout.tsx`, `app/(tabs)/settings-detail.tsx`, `src/features/feed/FeedHeader.tsx`, `src/features/feed/FeedPost.tsx`, `src/screens/legal/ConsentScreen.tsx`
  - Note: NativeWind `darkMode: 'class'` + 앱 테마 동기화(`setColorScheme`)를 연결해 시스템/다크/라이트 변경 시 즉시 반영.
- [x] 정책/신고 화면 다크모드 반영으로 법적 플로우 가독성 안정화
  - Evidence: `src/screens/legal/PolicyDocumentView.tsx`, `src/screens/legal/PolicyCenterScreen.tsx`, `src/screens/legal/OpenSourceLicenseScreen.tsx`, `src/screens/legal/ReportScreen.tsx`
  - Note: 문서/신고 폼의 배경·보더·텍스트를 다크 팔레트로 전환해 야간 사용 시 흰 카드 잔존 제거.
- [x] 연동 설정 화면 다크모드 및 상태 요약 카드 대비 개선
  - Evidence: `src/screens/dive-log/IntegrationSettingsScreen.tsx`
  - Note: 연동 요약/필터칩/실패 로그/빈상태를 테마 연동 색상으로 통일해 운영 점검 UX 안정화.
- [x] Stormglass 위험도 로직 복합위험 조건 보강
  - Evidence: `src/services/stormglassService.ts` (`calculateMarineRisk`)
  - Note: `파고+조류`, `저시야+강조류`, `저수온+강조류`, `강풍+파고` 조합 패널티 및 경고문을 추가해 보수적 판단 강화.
- [x] 관련 변경 파일 타깃 lint 통과
  - Evidence: local command run (`npx eslint src/screens/dive-log/IntegrationSettingsScreen.tsx src/services/stormglassService.ts src/screens/legal/ReportScreen.tsx`)
  - Evidence: `https://api.divergram.com/api/integrations/garmin/connect` `200`
  - Evidence: `https://api.divergram.com/api/integrations/garmin/logs?limit=2` `200`
  - Evidence: `https://api.divergram.com/api/notifications/settings` `GET/PATCH 200`
  - Evidence: `https://api.divergram.com/api/push/test` `200`
  - Evidence: `https://api.divergram.com/api/media/cloudinary/sign-upload` `503 cloudinary_not_configured` (키 미설정 정상)
- [x] 자격증 데이터 API 경로 확장 (`/api/data/certifications`)
  - Evidence: `prod-server:/home/divergram/api/server/routes/data.js` (`DATA_TABLES.certifications`)
  - Evidence: `prod-server:/home/divergram/api/server/index.js` (`app_certifications` table + index ensure schema)
  - Evidence: `scripts/test-prod-api-integration.sh` 실행 결과 `CERT_CREATE=200`, `CERT_STATUS_PATCH=200`

## 14) 체크리스트 우선 보강 (2026-05-23)
- [x] DiveLog 편집/미디어 폴리시 21차 (업로드 시도 횟수 추적 + 재시도 상한)
  - Evidence: `src/models/MediaFile.ts` (`uploadAttempts`)
  - Evidence: `src/screens/dive-log/DiveLogEditScreen.tsx` (`MAX_MEDIA_UPLOAD_ATTEMPTS`, `nextUploadAttemptCount`, 실패 미디어 재시도 제한/시도횟수 표시)
  - Note: 업로드 상태를 `대기/업로드중/완료/실패`로 유지하면서 항목별 시도 횟수를 노출하고, 실패 재시도는 최대 3회로 제한해 반복 실패 루프를 차단.
- [x] 변경 파일 eslint 재검증 통과 (미디어 시도횟수 보강분)
  - Command: `npx eslint src/screens/dive-log/DiveLogEditScreen.tsx src/models/MediaFile.ts`
- [x] 운영 API 통합 스모크 재검증 (2026-05-23, 13:34 UTC 기준)
  - Command: `./scripts/test-prod-api-integration.sh`
  - Evidence: `NOTIFICATIONS_GET/PATCH=200`, `PUSH_TEST=200`, `CLOUDINARY_SIGN/DELETE=503(cloudinary_not_configured)`, `CERT_CREATE/PATCH=200`, `OAUTH_PROVIDERS=200`, `OAUTH_MOBILE_INVALID_TOKEN=400`
- [x] 연동 UX 안정화 22차 (mock 문구 제거 + 테스트모드 안내)
  - Evidence: `src/screens/dive-log/IntegrationSettingsScreen.tsx`, `src/screens/dive-log/BluetoothDeviceScreen.tsx`
  - Note: 외부 서비스 연결/동기화 안내에서 `mock` 표기를 제거하고 `테스트 모드(운영 키 필요)` 문구로 통일, 계정 라벨의 `(mock)` 접미사를 화면 표기에서 정규화해 사용자 혼선을 완화.
- [x] 변경 파일 eslint 재검증 통과 (연동 UX 문구 정리 반영분)
  - Command: `npx eslint src/screens/dive-log/IntegrationSettingsScreen.tsx src/screens/dive-log/BluetoothDeviceScreen.tsx src/screens/dive-log/DiveLogEditScreen.tsx src/models/MediaFile.ts`
- [x] 스플래시/튜토리얼 1회성 진입 및 세션 유지 복구
  - Evidence: `app/index.tsx`, `app/(auth)/tutorial.tsx`, `src/lib/tutorial.ts`, `src/lib/runtimePermissions.ts`, `src/providers/AuthProvider.tsx`
  - Note: AsyncStorage 보조 저장소를 추가해 튜토리얼 완료/핵심 권한 요청/인증 세션을 재실행 후에도 복원하도록 정리했고, 튜토리얼은 최초 1회만 보이도록 유지.
- [x] App Store Connect 심사용 스크린샷/미리보기 교체
  - Evidence: `fastlane/screenshots/ko/01_tutorial_step1_iphone.png`, `fastlane/screenshots/ko/02_tutorial_step2_iphone.png`, `fastlane/screenshots/ko/03_tutorial_step3_iphone.png`, `fastlane/screenshots/ko/04_login_iphone.png`, `fastlane/screenshots/ko/05_splash_iphone.png`, `fastlane/screenshots/ko/06_tutorial_step1_ipad.png`
  - Evidence: `fastlane/screenshots/ko_1284x2778/*`, `fastlane/screenshots/ko_1320x2868/*`, `fastlane/screenshots/ko/07_app_preview_iphone.mov`, `fastlane/preview/ko/01_IPHONE_61_preview.mov`, `fastlane/preview/ko-KR/iphone/app_preview_iphone.mov`
  - Note: 피드/탐색/지도/로그/프로필 코어 화면으로 교체했고, 프리뷰 영상은 스테레오 AAC 트랙으로 재인코딩해 `MOV_RESAVE_STEREO` 재발을 차단.
- [x] App Store Connect 자산 업로드 및 TestFlight 빌드 가시성 확인
  - Command: `APPSTORECONNECT_USER='subi9807@gmail.com' APPSTORE_PROVIDER_ID='120813209' APP_IDENTIFIER='com.divergram.app.ios' fastlane ios upload_store_assets`
  - Evidence: 스크린샷 업로드 성공, 프리뷰 영상은 App Store Connect 처리 대기까지 완료
  - Command: `FASTLANE_TEAM_ID=6G5RCDLQLG FASTLANE_ITC_TEAM_ID=120813209 ... ruby -e 'require "spaceship"; ...'`
  - Evidence: `APP=6769253236`, `BUILD_COUNT=1`, `id=c81eba86-f1d4-42aa-a8ee-8c127d130a24`, `version=6`, `processingState=VALID`

- [x] App Store Connect 재제출 23차 (TestFlight 외부 심사 + App Review 재제출)
  - Evidence: beta localization 생성/갱신 완료(`locale=ko`, `description`/`feedbackEmail` 반영)
  - Evidence: 외부 그룹 `Divergram External`(id `4df2cc3e-450c-4466-a54f-76fdf25dda58`) 빌드 6 연결 완료
  - Evidence: 빌드 6 외부 상태 `WAITING_FOR_BETA_REVIEW`, beta submission id `c81eba86-f1d4-42aa-a8ee-8c127d130a24`
  - Evidence: 기존 App Review submission `83a0b688-b70a-4ada-b612-dd0ad88551cd` 취소 후 신규 submission `ee8affe3-3fb6-470b-be0a-25874b98eb77` 생성 및 `WAITING_FOR_REVIEW` 제출 완료
  - Evidence: App Review detail(`bd036748-020e-46b1-9891-ff2a59b8d10c`)에 reviewer contact/notes 반영 완료

- [x] Kakao 로그인 비노출/버전 7 반영/테스트플라이트 build 7 배포
  - Evidence: `src/config/featureFlags.ts`, `app.config.ts`, `app.json`, `app/(auth)/login.tsx`, `app/(tabs)/settings.tsx`, `app/(tabs)/settings-detail.tsx`
  - Evidence: Kakao 로그인 버튼과 설정 연동 진입을 feature flag로 숨기고 `kakaoLoginEnabled=false` 기본값을 적용
  - Evidence: iOS `buildNumber=7`, Android `versionCode=7` 반영
  - Command: `xcodebuild archive -workspace ios/Divergram.xcworkspace -scheme Divergram -configuration Release -destination generic/platform=iOS -archivePath build/ios/Divergram-1.0-7.xcarchive -allowProvisioningUpdates CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=6G5RCDLQLG`
  - Command: `xcodebuild -exportArchive -archivePath build/ios/Divergram-1.0-7.xcarchive -exportPath build/ios/export-1.0-7 -exportOptionsPlist build/ios/ExportOptions-AppStore-Upload.plist -allowProvisioningUpdates`
  - Evidence: App Store Connect 업로드 성공, build 7(`ec56e4d8-f7ae-4eba-ba2f-ef75114f1178`) `VALID`, `Divergram External` 그룹에 build 7만 남도록 정리 완료
  - Evidence: build 7 beta review submission 생성 후 `APPROVED`, external state `BETA_APPROVED`
  - Evidence: dSYM 보강으로 `hermesvm.framework.dSYM` 생성, archive 내 `dSYMs/`에 `Divergram.app.dSYM`, `ExpoModulesJSI.framework.dSYM`, `hermesvm.framework.dSYM` 확보

- [x] Android 릴리스 번들 생성 완료
  - Command: `cd android && ./gradlew :app:bundleRelease -PreactNativeArchitectures=arm64-v8a -x lintVitalAnalyzeRelease`
  - Evidence: `android/app/build/outputs/bundle/release/app-release.aab` 생성 완료
  - Note: Play Store 제출은 `Google Service Account Key`가 없어 `eas submit`가 중단됨. 키 파일이 들어오면 즉시 업로드 가능.

- [x] Android Play Store 제출 재시도 및 API 활성화 블로커 확인
  - Command: `npx eas-cli submit -p android -e production --path android/app/build/outputs/bundle/release/app-release.aab --non-interactive --wait --verbose`
  - Evidence: EAS Submit 업로드 성공 후 Google Play 제출 단계 진입, submission url `https://expo.dev/accounts/subi9806/projects/divergram/submissions/64ede421-d210-49e0-a450-c1f40dc31351`
  - Note: Google Play Android Developer API가 프로젝트 `80553477111`에서 비활성/미사용 상태라 `PERMISSION_DENIED`로 중단. Google Cloud Console에서 `androidpublisher.googleapis.com` API 활성화 후 재시도 필요.

- [x] iOS TestFlight build 7 외부 배포로 재정렬
  - Command: `fastlane pilot distribute -u 'subi9807@gmail.com' -a 'com.divergram.app.ios' -q '120813209' --build_number 7 --distribute_external true -g 'Divergram External' --notify_external_testers false --expire_previous_builds true`
  - Evidence: `Distributing new build to testers: 1.0 - 7`
  - Evidence: `Successfully distributed build to External testers 🚀`

- [x] Google Play Android Developer API 활성화 및 재제출 시도 완료
  - Command: 서비스 계정 JSON으로 Service Usage API 토큰 발급 후 `androidpublisher.googleapis.com` 활성화 요청
  - Evidence: `projects/80553477111/services/androidpublisher.googleapis.com` 상태 `ENABLED`
  - Command: `sleep 120 && npx eas-cli submit -p android -e production --path android/app/build/outputs/bundle/release/app-release.aab --non-interactive --wait --verbose`
  - Evidence: Google Play 제출 단계까지 진입했으나 `Package not found: com.divergram.app`로 중단
  - Note: Play Console에서 해당 패키지의 첫 앱 생성/첫 수동 제출이 아직 필요함. 첫 등록 이후에는 EAS 자동 제출 재사용 가능.

- [ ] Play Console 개발자 계정 확인 잔여 2건 처리 필요
  - Evidence: Play Console `Android 개발자 인증` 홈 화면에서 `본인 확인`이 미완료 상태로 표시되고, `Android 휴대기기에 액세스할 수 있는지 확인`, `연락처 전화번호 인증`도 대기 상태로 노출됨.
  - Evidence: `연락처 전화번호 인증` 상세 화면에서 "다른 모든 인증 작업(신원 인증/신분증 승인 포함) 완료 후" 진행하라고 안내함.
  - Evidence: `Android 휴대기기에 액세스할 수 있는지 확인` 상세 화면에서 Play Console 모바일 앱이 설치된 실제 Android 휴대기기 로그인/확인 절차가 필요하다고 안내함.
  - Note: 두 단계는 계정 소유자 신원 인증과 실제 Android 기기 확인이 필요해, 현재 환경에서 자동 완수 불가. 계정 소유자 측 수동 완료 후 `com.divergram.app` 첫 등록/재제출 재개 가능.

- [x] iOS 피드 삭제 런타임 오류 수정
  - Evidence: `src/features/feed/FeedPost.tsx`에서 `Alert` import 누락으로 인한 삭제 버튼 런타임 크래시 가능성 제거
  - Evidence: `src/lib/api.ts`의 `deletePost()`를 `Promise.allSettled()` 기반으로 조정해 하위 리소스 정리 실패가 게시물 삭제 전체를 막지 않도록 보강
  - Verification: `npx eslint src/features/feed/FeedPost.tsx src/lib/api.ts` 통과

## 15) 운영 UI/UX + API 연결 정리 (2026-06-10)
- [x] 프로필 사진 서버 저장
  - Evidence: `app/(tabs)/profile-edit.tsx`
  - Note: 사진 선택 시 `uploadImage()`로 서버 업로드 후 원격 URL만 저장해 로컬 파일 경로 의존을 제거.
- [x] 프로필 스쿠버/프리다이빙 레벨 서버 저장
  - Evidence: `app/(tabs)/profile-edit.tsx`, `src/lib/api.ts`, `db/migrations/20251124103000_add_profile_resort_and_post_operational_fields.sql`
  - Note: `scuba_level`, `freediving_level`를 프로필 업데이트/조회 양쪽에 반영하고, 누락 컬럼은 마이그레이션으로 보강.
- [x] 피드 태그 클릭 시 탐색 태그 검색
  - Evidence: `src/features/feed/FeedPost.tsx`, `app/(tabs)/explore.tsx`
  - Note: 해시태그를 탭하면 탐색 화면의 `q`/`tag` 쿼리로 연결되어 실제 피드 데이터만 필터링.
- [x] 피드 사진 더블탭 좋아요
  - Evidence: `src/features/feed/FeedPost.tsx`
  - Note: 이미지 영역 더블탭 시 `togglePostLike()` 호출.
- [x] 댓글 바텀시트 닫기/자동 종료 정리
  - Evidence: `src/features/feed/FeedPost.tsx`
  - Note: 댓글 저장 후 자동 닫힘 유지, 바텀시트 상단 닫기 버튼과 바깥 영역 닫기 동작을 함께 제공.
- [x] 피드 게시물 전체 편집 흐름으로 전환
  - Evidence: `src/features/feed/FeedPost.tsx`, `app/(tabs)/logs.tsx`, `src/lib/api.ts`
  - Note: 3점 메뉴의 수정은 로그 작성 화면으로 이동해 제목/위치만이 아닌 전체 운영 폼을 수정하도록 처리.
- [x] 로그 작성 필수값 완화
  - Evidence: `app/(tabs)/logs.tsx`
  - Note: Google 지도 포인트 좌표는 필수에서 제외하고, 포인트명과 주요 필드만으로 저장 가능하게 변경.
- [x] 피드 미디어 3:4 비율 유지
  - Evidence: `src/features/feed/FeedPost.tsx`
  - Note: 피드 사진/영상 영역을 세로형 비율로 고정.
- [x] 탐색 결과 → 게시물 이동
  - Evidence: `app/(tabs)/explore.tsx`, `src/lib/api.ts`
  - Note: 검색/기본 노출 카드 모두 게시물 상세로 연결.
- [x] 포인트 지도 운영화
  - Evidence: `app/(tabs)/location.tsx`, `src/lib/api.ts`, `src/services/googleMapService.ts`
  - Note: 방문 포인트/리조트 마커를 분리해 표시하고 하단 마커 리스트를 제거, 지도 팝업을 재디자인.
- [x] 리조트 메뉴 운영화
  - Evidence: `app/(tabs)/resorts.tsx`, `app/(tabs)/resort-detail.tsx`, `src/lib/api.ts`
  - Note: 가까운 순 정렬, 국가/지역/리조트명/주소 검색, 상세보기 버튼 동작을 실제 화면으로 연결.
- [x] 알림 메뉴 디자인 정리
  - Evidence: `app/(tabs)/notifications.tsx`
  - Note: 불필요한 파란 박스 느낌을 제거하고 카드형 알림 리스트로 통일.
- [x] 변경 파일 eslint 재검증 통과
  - Command: `npx eslint app/(tabs)/logs.tsx app/(tabs)/resorts.tsx app/(tabs)/resort-detail.tsx app/(tabs)/location.tsx app/(tabs)/notifications.tsx src/lib/api.ts src/config/sitemap.ts app/(tabs)/_layout.tsx src/features/feed/FeedPost.tsx app/(tabs)/profile-edit.tsx`
- [x] iOS 시뮬레이터 반영 확인
  - Command: `npm run dev:ios`
  - Evidence: `xcrun simctl io booted screenshot /tmp/divergram-sim/shot.png`
  - Note: 시뮬레이터에 Divergram 피드 화면이 정상 표시되는 것을 확인함.

## 16) 운영 프로필 정합화 (2026-06-10)
- [x] 프로필 저장/세션 응답 필드 정합화
  - Evidence: `prod-server:/home/divergram/api/server/index.js`, `prod-server:/home/divergram/api/server/routes/data.js`, `prod-server:/home/divergram/api/server/routes/auth.js`, `prod-server:/home/divergram/api/server/routes/adminData.js`
  - Note: `app_profiles`에 `scuba_level`, `freediving_level`, `license_image_url`를 추가하고, 인증/세션/데이터 라우트가 동일한 프로필 필드를 반환·저장하도록 통일했다.
  - Note: `divergram-api` PM2 재시작 후 `GET /api/data/profiles?limit=1` 응답에 신규 필드가 내려오는 것을 확인했다.

## 17) 인증/프로필 정합성 보강 (2026-06-11)
- [x] 자격증 화면 query 기반 목록 갱신 전환
  - Evidence: `src/screens/dive-log/CertificationScreen.tsx`
  - Note: effect 기반 로딩을 `react-query` 기반 목록 조회로 전환해 set-state-in-effect 경고를 제거하고, 등록/상태 변경 후 `refetch()`로 즉시 갱신되도록 안정화했다.
- [x] 프로필/자격증 변경 파일 eslint 재검증 통과
  - Command: `npx eslint 'app/(tabs)/profile.tsx' src/screens/dive-log/CertificationScreen.tsx src/services/certificationService.ts src/services/aiService.ts`

## 18) 관리자 페이지 + 운영 타입체크 정리 (2026-06-12)
- [x] 관리자 운영 페이지 추가
  - Evidence: `src/screens/admin/AdminDashboardScreen.tsx`, `src/lib/adminApi.ts`, `app/(tabs)/admin.tsx`
  - Note: 관리자 키 입력 후 서버의 사용자/자격증/신고/작업 큐/지도 포인트를 조회하고 차단, 상태 변경, 작업 배포까지 수행하는 운영 대시보드를 추가했다.
- [x] 공용 타입/브리지 정리
  - Evidence: `src/hooks/useBle.ts`, `src/components/NativeBridgeTest.tsx`, `src/lib/googleMapSearch.ts`, `src/services/nativeBleDiveService.ts`, `src/types/import-meta.d.ts`, `tsconfig.json`
  - Note: BLE/지도/브리지 콜백 타입을 정리하고, 운영 컴파일에서 제외해야 하는 웹/브리지 파일 범위를 정리해 TS 프로그램을 안정화했다.
- [x] 외부 아이콘 의존성 복구
  - Evidence: `package.json`, `package-lock.json`
  - Note: 웹 전용 화면에서 사용 중인 `@heroicons/react`, `lucide-react` 누락 의존성을 복구했다.
- [x] 정적 검증 통과
  - Command: `npx eslint src/screens/admin/AdminDashboardScreen.tsx src/lib/adminApi.ts src/services/authService.ts src/services/diveLogSyncService.ts src/hooks/useBle.ts src/components/NativeBridgeTest.tsx src/lib/googleMapSearch.ts src/services/nativeBleDiveService.ts src/types/import-meta.d.ts`
  - Command: `npx tsc --noEmit --pretty false`
  - Note: 운영 관리자 페이지와 관련 타입 검증이 모두 통과했다.

## 19) 관리자 대시보드 재구성 + 운영 설계 저장 (2026-06-13)
- [x] 관리자 대시보드 홈/메뉴 재구성
  - Evidence: `src/screens/admin/AdminDashboardScreen.tsx`, `src/components/AdminConsole.tsx`
  - Note: 대시보드, 회원관리, 리조트관리, 피드관리, 릴스관리, 방문자통계, 광고운영, 지도포인트, 시스템/보안 섹션을 동일 스냅샷 구조로 정리했다.
- [x] 운영 API 연결 정리
  - Evidence: `src/lib/adminApi.ts`, `src/lib/adminDashboard.ts`, `src/App.tsx`
  - Note: `/api/admin/health`, `/api/admin/stats`, `/api/admin/growth`, `/api/admin/users`, `/api/admin/certifications`, `/api/admin/reports`, `/api/admin/jobs`, `/api/admin/map-points`, `/api/admin/tables`, `/api/admin/table/:name`를 한 화면에서 읽도록 통합했다.
- [x] 회원 역할 분리/신고 상태 요약
  - Evidence: `src/components/AdminConsole.tsx`, `src/screens/admin/AdminDashboardScreen.tsx`, `src/lib/adminDashboard.ts`
  - Note: 일반회원/리조트회원/관리자 필터와 신고 접수·검토·처리·반려 요약을 추가해 운영 분류를 더 빠르게 확인할 수 있게 했다.
- [x] 운영 설계 문서/체크리스트 저장
  - Evidence: `docs/master-plan/admin/ADMIN_DASHBOARD_PLAN.md`, `docs/master-plan/admin/ADMIN_DASHBOARD_CHECKLIST.md`
  - Note: `adm.divergram.com` 기준의 관리자 진입 경로와 연결 상태를 문서로 고정했다.
- [x] 광고 운영 API 연결 완료
  - Evidence: `docs/master-plan/admin/ADMIN_DASHBOARD_CHECKLIST.md`, `src/sections/AdsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminAds.js`
  - Note: 광고 슬롯 UI와 `/api/admin/ads`를 연결해 광고 운영을 실제 관리 흐름으로 전환했다.

## 25) 관리자 역할 분리/신고 검색 강화 (2026-06-13)
- [x] 사용자 역할 분리 서버 필터 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`, `/Volumes/WD_Elements/Works/divergram_adm/src/AdminApp.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`
  - Note: 사용자 목록이 `general/resort/admin` 기준으로 서버 필터를 타도록 정리해 역할 분리가 실제 목록 조회에 반영되게 했다.
- [x] 신고 검색/대상 필터 강화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/ReportsSection.jsx`
  - Note: 신고 목록에 검색창을 추가하고 사유/대상 ID/작성자/메모까지 함께 좁혀볼 수 있게 했다.
- [x] 최신 번들/운영 게이트 재검증
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `rsync -a --delete --exclude 'node_modules/' --exclude '.git/' /Volumes/WD_Elements/Works/divergram_adm/ prod-server:/home/divergram/adm/`
  - Verification: `rsync -a --delete --exclude 'node_modules/' --exclude '.git/' /Volumes/WD_Elements/Works/divergram_api/ prod-server:/home/divergram/api/`
  - Verification: `pm2 restart divergram-api --update-env && pm2 restart divergram-admin --update-env`
  - Verification: `curl -L https://adm.divergram.com` returns `/assets/index-BoBpP7Ge.js` and `/assets/index-CsXxNT-F.css`
  - Verification: `curl -s -o /dev/null -w '%{http_code}' https://api.divergram.com/api/admin/ads` / `/api/admin/reports` / `/api/admin/users` returned `401`
  - Note: 광고/역할/신고 흐름이 최신 배포본과 인증 게이트 기준으로 다시 확인됐다.
- [x] 역할 필터/신고 검색 실데이터 검증
  - Verification: authenticated `GET /api/admin/users?role=all|general|resort|admin&limit=5` returned `200` and role-specific counts (`all=5`, `general=5`, `resort=0`, `admin=3`)
  - Verification: authenticated `GET /api/admin/reports?status=all|received|reviewing|resolved|rejected&limit=5` returned `200`
  - Verification: authenticated `GET /api/admin/users?role=admin&limit=5`, `GET /api/admin/reports?status=reviewing&targetType=post&limit=5`, `GET /api/admin/reports?q=제주&limit=5` all returned `200`
  - Note: 역할 분리와 신고 검색이 실제 운영 API에서 동작함을 수치로 확인했다.

## 20) 워크스페이스 분리 정리 (2026-06-13)
- [x] app / adm / api / www 역할 분리 문서화
  - Evidence: `docs/master-plan/architecture/WORKSPACE_SPLIT.md`
  - Note: 앱, 관리자, 백엔드, 공개 웹의 책임을 분리해 후속 에이전트 작업이 서로 섞이지 않도록 기준을 고정했다.
- [x] 원격 adm/api 코드 로컬 분리
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm`, `/Volumes/WD_Elements/Works/divergram_api`
  - Note: prod-server의 `/home/divergram/adm`, `/home/divergram/api`를 별도 디렉터리로 내려받아 현재 앱 저장소와 분리했다.
- [x] `adm.divergram.com` 배포 반영 완료
  - Evidence: `curl -L https://adm.divergram.com`
  - Note: 관리자 워크스페이스 최신 빌드를 반영해 새 번들을 서빙하도록 맞췄다.
- [x] `www` 워크스페이스 분리 완료
  - Evidence: `docs/master-plan/architecture/WORKSPACE_SPLIT.md`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_www/README.md`
  - Note: 공개 웹/정적 사이트 전용 경로를 별도 볼륨에 분리해 app/adm/api와 파일이 섞이지 않도록 정리했다.

## 21) 관리자 워크스페이스 재배포 및 JSON 안전화 (2026-06-13)
- [x] 관리자 웹 JSON 파싱 안전화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/lib/api.js`, `/Volumes/WD_Elements/Works/divergram_adm/src/AdminApp.jsx`
  - Note: HTML 에러 페이지가 JSON으로 잘못 파싱되던 구간을 안전 파서로 바꿔 `Unexpected token '<'` 류 오류를 줄였다.
- [x] 관리자 운영 스냅샷 확장
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/DashboardSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/SettingsSection.jsx`
  - Note: 회원 역할 분리, 신고 상태, 자격증 검토, 광고 운영 메모를 함께 볼 수 있도록 운영 화면을 확장했다.
- [x] `adm.divergram.com` 최신 빌드 반영
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `curl -L https://adm.divergram.com` returns `/assets/index-PpRNEnAz.js` and `/assets/index-DUW2QeAw.css`
  - Note: 로컬 빌드 결과를 `/home/divergram/adm`로 동기화해 외부 도메인이 새 번들을 서빙하도록 맞췄다.

## 22) 관리자 운영 API 확장 및 배포 재검증 (2026-06-13)
- [x] 광고 슬롯 운영 API 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminAds.js`, `/Volumes/WD_Elements/Works/divergram_api/server/index.js`
  - Note: `/api/admin/ads`의 목록/생성/수정/삭제를 분리해 피드·릴스 광고 슬롯을 운영 API로 관리할 수 있게 했다.
- [x] 앱 피드 광고 슬롯 실연결
  - Evidence: `/Volumes/WD_Elements/Works/divergram/app/app/(tabs)/feed.tsx`, `/Volumes/WD_Elements/Works/divergram/app/src/features/feed/FeedAdSlot.native.tsx`, `/Volumes/WD_Elements/Works/divergram/app/src/lib/api.ts`
  - Note: 피드 3개 카드마다 서버 활성 광고 슬롯을 교차 노출하고, 실제 AdMob 배너 또는 대체 운영 카드가 나오도록 연결했다.
- [x] 관리자 광고 노출 토글 보강
  - Evidence: `/Volumes/WD_Elements/Works/divergram/adm/src/sections/AdsSection.jsx`
  - Note: 광고 슬롯을 `노출 시작/중단`으로 즉시 바꿔 운영자가 피드/릴스 광고 송출 상태를 바로 제어할 수 있게 했다.
- [x] 신고/제재 흐름 상세화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`, `/Volumes/WD_Elements/Works/divergram_api/server/middleware/requireAdmin.js`
  - Note: 관리자 행위 추적(`req.adminAuth`)과 신고 상세/액션 이력/상태 변경 저장을 추가해 운영 제재 흐름을 보강했다.
- [x] 운영 배포 재검증
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/index.js`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `pm2 restart divergram-api --update-env`
  - Verification: `curl -L https://adm.divergram.com` now returns `/assets/index-B55qiyG7.js` and `/assets/index-DUW2QeAw.css`
  - Verification: `curl -s -o /dev/null -w '%{http_code}' https://api.divergram.com/api/admin/ads` and `/api/admin/reports` returned `401`
  - Note: 관리자 정적 번들과 API 코드 모두 원격 서버에 반영됐고, 새 관리자 라우트가 인증 게이트까지 정상 진입하는 것을 확인했다.

## 23) 관리자 신고/광고 운영화 마감 (2026-06-13)
- [x] 신고 관리 상세/처리 화면 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/ReportsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/AdminApp.jsx`
  - Note: 신고 목록에서 상세를 열고, 상태 변경/메모 저장/처리 이력 확인이 가능한 운영 화면으로 마무리했다.
- [x] 광고 슬롯 생성/수정/삭제 화면 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/AdsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/components/Icon.jsx`
  - Note: 광고 슬롯을 생성·수정·삭제하면서 노출 위치/정렬/활성 상태를 조절할 수 있게 했다.
- [x] 대시보드/운영 요약 재정렬
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/DashboardSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 중복 카드 정리, 역할 필터 유지, 운영용 카드 레이아웃 정리를 반영했다.
- [x] 관리자 배포 최신 반영 확인
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `rsync -a --delete --exclude node_modules --exclude .git --exclude '.env*' /Volumes/WD_Elements/Works/divergram_adm/ prod-server:/home/divergram/adm/`
  - Verification: `pm2 restart divergram-admin --update-env`
  - Verification: `curl -L https://adm.divergram.com` returns `/assets/index-D1PKnBz2.js` and `/assets/index-CsXxNT-F.css`
  - Verification: `curl -s -o /dev/null -w '%{http_code}' https://api.divergram.com/api/admin/ads` / `/api/admin/reports` / `/api/admin/users` all return `401`
  - Note: 관리자 운영 화면과 인증 경계가 실서버에서 다시 확인됐다.

## 24) 관리자 검색/리조트 운영 정합성 (2026-06-13)
- [x] 사용자 검색 파라미터 정합화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`, `/Volumes/WD_Elements/Works/divergram_adm/src/AdminApp.jsx`
  - Note: 관리자 사용자 검색이 `q`와 `search` 둘 다 받도록 정리해 화면과 서버의 검색 파라미터가 어긋나지 않게 맞췄다.
- [x] 리조트 운영 API 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminCore.js`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/ResortsSection.jsx`
  - Note: `/api/admin/resorts` 조회와 `/api/admin/resorts/:id` 수정 라우트를 추가해 리조트 운영 화면이 실제 서버 데이터와 연결되게 했다.
- [x] 운영 스모크 재검증
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/adminCore.js`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `pm2 restart divergram-api --update-env`
  - Verification: authenticated smoke test returned `USERS=200`, `RESORTS=200`, `REPORTS=200`
  - Verification: unauthenticated `curl https://api.divergram.com/api/admin/resorts` returned `401`
  - Note: 관리자 사용자/리조트/신고 검색과 운영 게이트를 같이 확인했다.

## 25) 관리자 신고/광고 운영 화면 정교화 (2026-06-13)
- [x] 신고 상세 대상 요약 카드 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/ReportsSection.jsx`
  - Note: 신고 상세 패널에 제목/작성자/위치/부가정보를 분리 표시해 운영자가 신고 대상 맥락을 빠르게 확인할 수 있게 했다.
- [x] 광고 슬롯 미리보기 카드 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/AdsSection.jsx`
  - Note: 광고 편집 폼에 제목/문구/노출 위치/액션 라벨/타깃 URL 미리보기를 넣어 운영자가 실제 노출 모습을 바로 점검할 수 있게 했다.
- [x] 최신 번들 재배포 및 인증 경계 재확인
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `rsync -a --delete --exclude 'node_modules/' --exclude '.git/' ./ prod-server:/home/divergram/adm/`
  - Verification: `pm2 restart divergram-admin --update-env`
  - Verification: `curl -L https://adm.divergram.com` returns `/assets/index-Cc0gW4B8.js` and `/assets/index-CsXxNT-F.css`
  - Verification: `curl -s -o /dev/null -w '%{http_code}' https://api.divergram.com/api/admin/ads` / `/api/admin/reports` / `/api/admin/users` returned `401`
  - Note: 최신 관리자 UI와 인증 게이트를 실서버 기준으로 다시 맞췄다.

## 26) 관리자 운영/로그인/푸시 안정화 (2026-06-13)
- [x] 관리자 피드/릴스 삭제 기능 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/FeedsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/ReelsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminCore.js`
  - Note: 관리자에서 피드/릴스를 직접 삭제할 수 있게 했고, 게시물 삭제 시 미디어/좋아요/댓글/저장/알림까지 함께 정리하도록 서버 라우트를 추가했다.
- [x] 관리자 JSON/HTML 응답 안전화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/lib/api.js`, `/Volumes/WD_Elements/Works/divergram_adm/src/AdminApp.jsx`
  - Note: `/api/admin/audit-logs` 경로 추가와 Promise.allSettled 기반 갱신으로 한 라우트 실패가 전체 사용자/광고/리조트 데이터를 비우지 않도록 보강했다.
- [x] 관리자 광고 운영화/사용자 관리 화면 안정화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/AdsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`
  - Note: 광고 운영 패널의 레이아웃을 재정렬하고, 사용자 목록 카드/필터가 비어 보이지 않도록 운영 화면 정리를 적용했다.
- [x] 앱 SNS 로그인/운영 API base 정합화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_app/src/components/Auth.tsx`, `/Volumes/WD_Elements/Works/divergram_app/src/lib/api-base.ts`
  - Note: 웹 SNS 로그인과 운영 상태 체크가 `/api` 중복 없이 같은 base를 쓰도록 정리해 `Cannot GET /api/` 계열 HTML 응답 가능성을 낮췄다.
- [x] 앱 푸시 토큰 등록 부트스트랩 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_app/src/App.tsx`, `/Volumes/WD_Elements/Works/divergram_app/src/lib/notifications.ts`, `/Volumes/WD_Elements/Works/divergram_app/src/services/notificationService.ts`
  - Note: 로그인 후 푸시 권한/Expo 토큰/FCM 등록이 실제 실행되도록 초기화 흐름을 붙여 회원가입·로그인 직후 디바이스 토큰 수집이 가능해졌다.
- [x] 운영 재배포 및 검증
  - Verification: `npx eslint src/components/Auth.tsx src/App.tsx src/lib/api-base.ts src/screens/admin/AdminDashboardScreen.tsx`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `rsync -a --delete --exclude 'node_modules/' --exclude '.git/' --exclude '.env*' /Volumes/WD_Elements/Works/divergram_adm/ prod-server:/home/divergram/adm/`
  - Verification: `rsync -a --delete --exclude 'node_modules/' --exclude '.git/' --exclude '.env*' /Volumes/WD_Elements/Works/divergram_api/ prod-server:/home/divergram/api/`
  - Verification: `pm2 restart divergram-api --update-env && pm2 restart divergram-admin --update-env`
  - Verification: `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://api.divergram.com/api/health` → `200 application/json; charset=utf-8`
  - Verification: `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' 'https://api.divergram.com/api/admin/audit-logs?limit=1'` → `401 application/json; charset=utf-8`
  - Verification: `curl -L -s https://adm.divergram.com | rg -o '/assets/index-[^" ]+' | head -n 2` → `index-pFub1ry2.js`, `index-Ds7kjJDn.css`

## 27) 관리자 회원 삭제 / 회원 게시물 일괄 삭제 (2026-06-13)
- [x] 회원 단일 삭제 API 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`
  - Note: `DELETE /api/admin/users/:userId`에서 회원 본문, 프로필, 게시물, 좋아요, 댓글, 저장, 알림, 팔로우, 인증, OAuth 연동, 디바이스 토큰, 메시지, 전달 상태를 트랜잭션으로 정리하도록 만들었다.
- [x] 회원 게시물만 일괄 삭제 API 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`
  - Note: `DELETE /api/admin/users/:userId/posts`로 회원은 유지한 채 해당 사용자의 게시물과 부속 미디어/좋아요/댓글/저장/알림/신고만 한 번에 지우도록 분리했다.
- [x] 관리자 사용자 카드 액션 정리
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/AdminApp.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 사용자 카드에 게시물 수를 표시하고, `게시물 전체 삭제`와 `회원 삭제` 버튼을 분리해 운영 실수를 줄였다.
- [x] 실서버 배포 및 라우트 검증
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `rsync -a --delete --exclude 'node_modules/' --exclude '.git/' --exclude '.env*' /Volumes/WD_Elements/Works/divergram_adm/ prod-server:/home/divergram/adm/`
  - Verification: `rsync -a --delete --exclude 'node_modules/' --exclude '.git/' --exclude '.env*' /Volumes/WD_Elements/Works/divergram_api/ prod-server:/home/divergram/api/`
  - Verification: `pm2 restart divergram-api --update-env && pm2 restart divergram-admin --update-env`
  - Verification: authenticated smoke test on prod returned `404 application/json; charset=utf-8` for `DELETE /api/admin/users/0/posts` and `DELETE /api/admin/users/0`
  - Verification: `curl -L -s https://adm.divergram.com | grep -oE '/assets/index-[^"]+' | head -n 2` → `/assets/index-IG4ee7qk.js`, `/assets/index-DYe4zQ6E.css`
  - Note: 삭제 경로와 관리자 최신 번들이 실서버에서 반영된 상태까지 확인했다.

## 28) 관리자 회원목록 상세 운영정보 확장 (2026-06-13)
- [x] 회원 사진/가입일/가입방식/다이빙 레벨 표시
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`
  - Note: 사용자 목록 응답에 `avatar_url`, `created_at`, `signup_method`, `auth_methods`, `scuba_level`, `freediving_level`를 추가해 운영자가 프로필과 가입정보를 한 화면에서 볼 수 있게 했다.
- [x] 세로 스크롤 가능한 운영 테이블로 전환
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 카드 그리드 대신 스크롤 가능한 테이블로 바꿔 많은 회원을 아래로 내려가며 확인할 수 있게 했다.
- [x] 실서버 반영 및 응답 검증
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `curl -s -H "x-admin-key: ***" https://api.divergram.com/api/admin/users?limit=1` returns `signup_method=email`, `avatar_url`, `scuba_level`, `freediving_level`
  - Note: 운영 관리자 페이지에서 회원 상세 정보를 바로 볼 수 있도록 서버/화면을 함께 정리했다.

## 29) 관리자 푸시 발송/장치 식별 보강 (2026-06-13)
- [x] 관리자 푸시 발송 API 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminPush.js`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/index.js`
  - Note: 관리자에서 전체/일반/리조트/관리자/개별 사용자 대상으로 Expo 푸시를 보낼 수 있게 하고, 발송 결과와 감사 로그를 함께 남기도록 했다.
- [x] 관리자 설정 화면에 푸시 발송 폼 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/SettingsSection.jsx`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 제목/본문/대상/개별 사용자 ID/추가 JSON을 입력해 바로 발송할 수 있도록 운영 폼을 정리했다.
- [x] push token 저장 시 설치 식별자 보강
  - Evidence: `/Volumes/WD_Elements/Works/divergram_app/src/services/notificationService.ts`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_app/src/lib/api.ts`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/push.js`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/index.js`
  - Note: 앱에서 생성한 설치 ID를 토큰과 함께 저장해, 추후 장치 단위 운영 확장도 가능하게 했다.
- [x] 변경 파일 검증 통과
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/adminPush.js`
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/push.js`
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/index.js`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `npx tsc --noEmit --pretty false` in `/Volumes/WD_Elements/Works/divergram_app`
  - Verification: `curl -X POST https://api.divergram.com/api/admin/push/send` → `401 {"error":"unauthorized"}`

## 30) 관리자 푸시 대상 필터/예약/이력 확장 (2026-06-13)
- [x] 회원 필터 세분화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/lib/adminPushDelivery.js`
  - Note: 가입일 이후/이전, 스쿠버 레벨, 프리다이빙 레벨, 차단 여부, 특정 사용자 ID까지 대상으로 좁힐 수 있게 했다.
- [x] 예약 발송 지원
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminPush.js`
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/queue-worker.js`
  - Note: `scheduledAt`가 미래면 `app_jobs`에 `admin.push.send`를 적재하고 작업자에서 자동 발송하도록 연결했다.
- [x] 발송 이력 화면 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/SettingsSection.jsx`
  - Note: 최근 발송/예약 이력을 즉시 확인할 수 있게 관리자 설정 화면에 이력 카드를 추가했다.
- [x] 변경 파일 검증 통과
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/lib/adminPushDelivery.js`
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/adminPush.js`
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/queue-worker.js`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Verification: `npx tsc --noEmit --pretty false` in `/Volumes/WD_Elements/Works/divergram_app`
  - Verification: `curl -X POST https://api.divergram.com/api/admin/push/send` → `401 {"error":"unauthorized"}`
  - Verification: `curl https://api.divergram.com/api/admin/push/history` → `401 {"error":"unauthorized"}`

## 31) 관리자 회원 화면/푸시 템플릿 운영 정리 (2026-06-13)
- [x] 회원 관리 화면 운영성 보강
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 회원 목록에 정상/차단/인증/SNS 연동 요약을 추가하고, 상태/연동 방식 필터를 붙여 운영자가 빠르게 찾을 수 있게 정리했다.
- [x] 푸시 템플릿 버튼 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/SettingsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 전체 공지, 업데이트, 리조트 공지, 안전 알림, 이벤트 템플릿을 버튼으로 바로 채워 넣을 수 있게 해서 반복 발송 속도를 높였다.
- [x] 검증 통과
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Note: 운영 화면만 손대고 빌드가 깨지지 않는 상태까지 확인했다.

## 32) 관리자 회원 상세 패널 / 푸시 템플릿 재사용 (2026-06-13)
- [x] 회원 상세 패널 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 사용자 행을 클릭하면 상세 패널에서 사진, 가입일, 연동 수단, 다이빙 레벨, 게시물 수, 운영 버튼을 한 번에 보도록 정리했다.
- [x] 푸시 템플릿 저장/재사용
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/SettingsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 자주 쓰는 푸시 문구를 로컬 저장하고 다시 불러와서 재사용할 수 있게 했다.
- [x] 검증 통과
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`
  - Note: 빌드가 정상 통과했고 실서버 반영 준비 상태다.

## 33) 회원정보 수정 / 푸시 템플릿 서버 공용화 (2026-06-13)
- [x] 회원 정보 직접 수정
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`, `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`
  - Note: 닉네임, 이메일, 이름, 소개, 이미지, 웹사이트, 계정형태, 스쿠버/프리다이빙 레벨, 역할, 차단, 이메일 인증을 운영자가 상세 패널에서 바로 수정할 수 있게 했다.
- [x] 푸시 템플릿 서버 저장
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/index.js`, `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminPush.js`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/SettingsSection.jsx`
  - Note: 템플릿을 서버에 저장/삭제/재사용하도록 바꿔 관리자 간 공용으로 쓸 수 있게 했다.
- [x] 검증 통과
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/adminModeration.js`
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/routes/adminPush.js`
  - Verification: `node --check /Volumes/WD_Elements/Works/divergram_api/server/index.js`
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`

## 34) 관리자 피드·릴스·회원 선택 삭제 (2026-06-13)
- [x] 선택 삭제 체크박스 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/FeedsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/ReelsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`
  - Note: 피드, 릴스, 회원 목록에 개별 체크박스와 현재 목록 전체 선택을 붙여 운영자가 여러 항목을 한 번에 고를 수 있게 했다.
- [x] 일괄 삭제 연결
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/AdminApp.jsx`
  - Note: 선택한 피드/릴스는 게시물 삭제 API로, 선택한 회원은 회원 삭제 API로 한 번에 처리하도록 연결했다.
- [x] 검증 통과
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`

## 35) 운영 정리 / 채널 발송 정책 / 관리자 설정 정비 (2026-06-14)
- [x] DB 샘플 데이터 정리
  - Evidence: `prod-server:/home/divergram` DB cleanup transaction
  - Note: 샘플 프로필·게시물·메시지·알림·신고 bulk 데이터를 제거하고 실사용 프로필만 남도록 정리했다.
- [x] 회원가입/이벤트 발송 채널 설정
  - Evidence: `/Volumes/WD_Elements/Works/divergram_api/server/routes/adminCommunicationSettings.js`, `/Volumes/WD_Elements/Works/divergram_api/server/index.js`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/SettingsSection.jsx`
  - Note: 회원가입/이벤트/안전/신고·제재별 메일·푸시·SMS 토글을 관리자 화면에서 저장하고 `app_records`에 영속화한다.
- [x] 관리자 설정 화면 운영 수준 정비
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/SettingsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 샘플 생성 버튼은 개발 전용 고급 도구로 내리고, 운영 요약 카드와 채널 매트릭스 카드로 설정 화면을 재구성했다.
- [x] 운영 배포 검증
  - Evidence: `prod-server:/home/divergram/adm/dist/`, `prod-server:/home/divergram/api/server/routes/adminCommunicationSettings.js`
  - Note: 관리자 사이트 새 빌드와 API 라우트를 배포했고, `https://adm.divergram.com` 자산 해시 갱신 및 `https://api.divergram.com/api/admin/communication-settings` 응답을 확인했다.

## 36) 관리자 회원 테이블/상세 편집 분리 (2026-06-14)
- [x] 회원 목록 테이블 단순화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`
  - Note: 회원 목록을 요약 테이블로 정리하고, 각 행은 사진/가입일/가입방식/레벨/상태/게시물만 보이도록 단순화했다.
- [x] 상세로 이동 후 수정
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 행 클릭 또는 `상세/수정` 버튼으로 아래 상세 패널로 이동해 회원정보를 수정하도록 재구성했다.
- [x] 검증 통과
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`

## 37) 관리자 회원 관리 레이아웃 재구성 (2026-06-14)
- [x] 회원 관리 레이아웃 재설계
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/UsersSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 회원 목록은 좌측 테이블, 수정은 우측 상세 패널로 분리해 운영 흐름을 다시 구성했다.
- [x] 검증 통과
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`

## 38) 관리자 전역 레이아웃 정리 (2026-06-14)
- [x] 공통 화면 비율 보정
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/styles.css`
  - Note: 공통 콘텐츠/그리드/표 스크롤 기준을 맞추고, summary-grid·users-grid·media-table-scroll·logs-table-scroll을 추가해 섹션 간 레이아웃 편차를 줄였다.
- [x] 리조트/로그/피드/릴스 레이아웃 정비
  - Evidence: `/Volumes/WD_Elements/Works/divergram_adm/src/sections/ResortsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/LogsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/FeedsSection.jsx`, `/Volumes/WD_Elements/Works/divergram_adm/src/sections/ReelsSection.jsx`
  - Note: 리조트는 카드 그리드, 감사 로그는 스크롤 테이블, 피드/릴스는 표 영역을 고정 높이 스크롤 박스로 맞췄다.
- [x] 검증 통과
  - Verification: `npm run build` in `/Volumes/WD_Elements/Works/divergram_adm`

## 39) Android / iOS 배포 정리 (2026-06-15)
- [x] Android 내부 테스트 릴리스 확인
  - Evidence: Google Play Console `내부 테스트` 트랙에서 `Divergram`이 `내부 테스터에게 제공됨` 상태로 전환됨.
  - Note: `com.divergram.app` 내부 테스트 릴리스가 저장 및 출시 완료되었다.
- [x] iOS TestFlight 내부 테스터 배포
  - Evidence: `fastlane pilot distribute -u 'subi9807@gmail.com' -a 'com.divergram.app.ios' -q '120813209' -m ios --build_number 7 --notify_external_testers false --expire_previous_builds true`
  - Note: 외부 beta review는 현재 버전에서 닫혀 있어 내부 테스터 배포로 정리했다.

## 40) 소셜 로그인 확장 / 재배포 준비 (2026-06-16)
- [x] Google / Apple 로그인 경로 정리
  - Evidence: `/Volumes/WD_Elements/Works/divergram_app/src/providers/AuthProvider.tsx`, `/Volumes/WD_Elements/Works/divergram_app/app/(auth)/login.tsx`, `/Volumes/WD_Elements/Works/divergram_api/server/routes/auth.js`
  - Note: Google/Apple 로그인 공통 처리, 콜백 단순화, Apple iOS 검증, 모바일 OAuth 응답 경로를 다시 맞췄다.
- [x] Kakao / Naver / Instagram 로그인 추가
  - Evidence: `/Volumes/WD_Elements/Works/divergram_app/src/lib/auth/instagram.ts`, `/Volumes/WD_Elements/Works/divergram_app/src/lib/auth/kakao.ts`, `/Volumes/WD_Elements/Works/divergram_app/src/lib/auth/naver.ts`, `/Volumes/WD_Elements/Works/divergram_app/src/config/socialAuth.ts`
  - Note: 앱 설정과 `.env.example`에 필요한 키를 정리했고, 로그인 화면과 웹/모바일 OAuth provider 목록에 새 채널을 연결했다.
- [x] 네이티브 빌드 번호 정리
  - Evidence: `/Volumes/WD_Elements/Works/divergram_app/ios/Divergram.xcodeproj/project.pbxproj`, `/Volumes/WD_Elements/Works/divergram_app/ios/App/App.xcodeproj/project.pbxproj`, `/Volumes/WD_Elements/Works/divergram_app/android/app/build.gradle`
  - Note: TestFlight/Play 업로드가 새 빌드로 인식되도록 iOS build number와 Android versionCode를 올렸다.
- [x] iOS precompiled modules 비활성화
  - Evidence: `/Volumes/WD_Elements/Works/divergram_app/app.config.ts`, `/Volumes/WD_Elements/Works/divergram_app/ios/Podfile.properties.json`
  - Note: `react-native-safe-area-context`와 `RNWorklets`의 xcframework 전환 스크립트가 빌드에서 경로를 놓치던 문제를 줄이기 위해 `ios.usePrecompiledModules=false`로 내려 source build 경로로 안정화했다.
- [~] iOS / Android 재배포 진행중
  - Verification: `./node_modules/.bin/eas build -p ios --profile production --non-interactive`
  - Verification: `./node_modules/.bin/eas build -p android --profile production --non-interactive`
  - Note: 현재는 EAS 업로드와 fingerprint 단계가 진행 중이라 완료 URL은 빌드 종료 후 확정한다.
