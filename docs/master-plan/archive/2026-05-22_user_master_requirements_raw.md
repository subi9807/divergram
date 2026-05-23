Divergram 앱에 외부 서비스 연동, DiveLog 관리, Bluetooth 로그 동기화, 해양 날씨, AI 기능, 설정 메뉴를 통합 개발해줘.

Divergram은 스쿠버다이빙, 프리다이빙, 스노클링 사용자를 위한 다이빙 SNS 앱이다.
기존 기능은 피드, 릴스, 다이빙 포인트, 사용자 프로필, 설정 화면을 포함한다.

이번 작업의 목표는 Divergram을 단순 SNS가 아니라
다이빙 기록, 해양 날씨, 장비 연동, 안전 관리, AI 추천 기능이 포함된 다이버 플랫폼으로 확장하는 것이다.

---

# 1. 전체 개발 목표

아래 기능을 모두 포함해서 개발해줘.

- Google Maps 기반 다이빙 포인트 기능
- Stormglass API 기반 해양 날씨 기능
- Google / Apple / Kakao / Facebook 로그인 유지
- Instagram은 로그인보다 공유 기능 중심으로 연동
- Garmin / Suunto / Shearwater Cloud 외부 API 로그 연동
- Bluetooth 기반 다이빙 컴퓨터 로그 연동
- 설정 화면에 “DiveLog 관리” 메뉴 추가
- 가져온 DiveLog를 선택해서 상세 편집 가능
- 사진, 영상, 메모, 장비, 버디, 태그, 공개 범위 추가 가능
- PADI / SSI 자격증 관리
- Firebase Cloud Messaging 푸시 알림
- Cloudinary 미디어 업로드
- OpenAI API 기반 AI 요약/추천/캡션 기능

---

# 2. Google Maps 기능

현재 Google Maps API는 연동된 상태로 가정한다.

추가 구현 기능:

- 다이빙 포인트 마커 표시
- 현재 위치 기반 주변 다이빙 포인트 탐색
- 주변 다이빙샵 검색
- 다이빙 포인트 상세 페이지 연결
- 포인트 즐겨찾기
- 다이빙 로그와 위치 연결
- 입수 위치 GPS 기록
- 출수 위치 GPS 기록
- 로그 작성 시 지도에서 포인트 선택 가능
- 포인트별 사진, 리뷰, 해양 날씨 표시

처리 방안:

- DivePoint 모델 생성
- Google Maps Marker와 DivePoint 데이터 연결
- 위치 권한 요청 처리
- 위치 권한 거부 시 수동 검색 모드 제공
- 지도 API 에러 발생 시 기본 리스트 화면 fallback 제공

---

# 3. Stormglass API 해양 날씨 연동

Stormglass API를 사용해서 다이빙 포인트별 해양 날씨를 조회한다.

조회 데이터:

- 파고
- 조류 방향
- 조류 속도
- 수온
- 풍속
- 시야
- 조수 시간
- 기온
- 날씨 상태

기능:

- 다이빙 포인트 좌표 기준 해양 데이터 조회
- 오늘의 해양 상태 표시
- 시간대별 해양 상태 표시
- 다이빙 가능 여부 계산
- 초보자 위험 경고
- 포인트별 추천도 표시
- 위험도 상태값 생성

위험도 상태:

- 좋음
- 보통
- 주의
- 위험

예시 문구:

- “오늘은 파고가 낮고 시야가 좋아 다이빙하기 좋은 조건입니다.”
- “현재 조류가 강해 초보자는 입수를 피하는 것이 좋습니다.”
- “수온이 낮으므로 보온 장비를 준비하는 것이 좋습니다.”

처리 방안:

- stormglassService.ts 생성
- 좌표 기반 API 요청 함수 생성
- API 응답을 MarineWeather 모델로 변환
- API 실패 시 캐시된 최근 데이터 표시
- 데이터 없을 경우 “해양 정보 없음” 상태 처리
- 위험도 계산 함수 별도 분리
- 향후 AI 설명과 연결 가능하도록 구조화

---

# 4. 로그인 / 계정 연동

이미 연동된 로그인:

- Google Login
- Apple Login
- Kakao Login
- Facebook Login

Instagram 처리 방향:

Instagram은 로그인 기능보다 콘텐츠 공유 기능 중심으로 구현한다.

Instagram 기능:

- 사용자 프로필에 Instagram 링크 등록
- 게시글 Instagram 공유
- 다이빙 로그 이미지 생성 후 Instagram 공유
- Instagram Story 공유
- 릴스 공유 기능 준비

처리 방안:

- Instagram 로그인은 MVP 필수에서 제외
- instagramShareService.ts 생성
- 공유 가능한 이미지/텍스트 생성
- 앱 설치 여부 확인
- Instagram 앱 미설치 시 공유 시트 fallback
- 프로필 설정에 Instagram URL 입력 필드 추가

---

# 5. DiveLog 외부 API 연동

Garmin, Suunto, Shearwater Cloud에서 다이빙 로그 데이터를 가져올 수 있어야 한다.

연동 대상:

- Garmin
- Suunto
- Shearwater Cloud

기능:

- 외부 계정 연결
- 로그 목록 가져오기
- 로그 상세 가져오기
- Divergram 로그로 저장
- 중복 로그 방지
- 수동 동기화
- 자동 동기화
- 동기화 실패 처리
- 마지막 동기화 시간 저장
- 외부 계정 연결 해제

가져올 데이터:

- 다이빙 날짜
- 입수 시간
- 출수 시간
- 총 다이빙 시간
- 최대 수심
- 평균 수심
- 수온
- GPS 위치
- 심박수
- 다이빙 프로필 그래프 데이터
- 장비 정보
- 메모
- 로그 원본 ID
- 로그 출처

처리 방안:

- garminService.ts 생성
- suuntoService.ts 생성
- shearwaterService.ts 생성
- diveLogSyncService.ts 생성
- 외부 로그 데이터를 ExternalDiveLog 모델로 변환
- ExternalDiveLog를 Divergram DiveLog 모델로 변환
- sourceType + externalLogId 기준으로 중복 방지
- API 실패 시 재시도 로직 추가
- 동기화 상태값 관리

동기화 상태:

- 대기중
- 동기화중
- 완료
- 실패
- 중복
- 취소됨

---

# 6. Bluetooth 기반 다이빙 컴퓨터 연동

외부 API뿐 아니라 Bluetooth를 통해 다이빙 컴퓨터에서 직접 로그 데이터를 가져올 수 있어야 한다.

지원 방식:

- Bluetooth Low Energy
- iOS Bluetooth 지원
- Android Bluetooth 지원

지원 기기 예시:

- Garmin Descent
- Suunto D5
- Shearwater Perdix
- Shearwater Teric
- 기타 BLE 지원 다이빙 컴퓨터

기능:

- Bluetooth 권한 요청
- 주변 다이빙 컴퓨터 검색
- 기기 선택
- 기기 연결
- 연결 상태 표시
- 로그 데이터 다운로드
- 다운로드한 로그를 Divergram DiveLog로 변환
- 기기 등록
- 기기 해제
- 마지막 동기화 시간 저장
- 자동 동기화 ON/OFF
- 연결 실패 처리
- 동기화 실패 로그 저장

Bluetooth 처리 흐름:

1. Bluetooth 권한 요청
2. 주변 기기 스캔
3. 다이빙 컴퓨터 선택
4. 기기 연결
5. 기기 정보 조회
6. 로그 목록 조회
7. 로그 데이터 다운로드
8. 공통 DiveLog 포맷으로 변환
9. 중복 로그 필터링
10. Divergram 로그로 저장
11. 동기화 결과 표시

필요 권한:

iOS:
- Bluetooth
- 위치 권한

Android:
- BLUETOOTH_SCAN
- BLUETOOTH_CONNECT
- ACCESS_FINE_LOCATION

처리 방안:

- bluetoothDiveService.ts 생성
- diveComputerAdapter.ts 생성
- Adapter 패턴 사용
- GarminBluetoothAdapter 생성
- SuuntoBluetoothAdapter 생성
- ShearwaterBluetoothAdapter 생성
- 지원하지 않는 기기는 GenericBluetoothAdapter로 처리
- BLE 연결 실패 시 재시도 버튼 제공
- 기기별 프로토콜 차이를 adapter에서 흡수
- 실제 프로토콜이 없는 경우 mock adapter로 먼저 UI 개발

공통 인터페이스:

interface DiveComputerAdapter {
  scanDevices(): Promise<DiveDevice[]>
  connect(deviceId: string): Promise<void>
  disconnect(): Promise<void>
  getDeviceInfo(): Promise<DeviceInfo>
  getDiveLogList(): Promise<ExternalDiveLog[]>
  syncLogs(): Promise<DiveLog[]>
}

---

# 7. 공통 DiveLog 데이터 모델

외부 API, Bluetooth, 수동 입력 로그는 모두 공통 DiveLog 모델로 저장한다.

DiveLog 필드:

- id
- userId
- sourceType
  - manual
  - garmin_api
  - suunto_api
  - shearwater_api
  - bluetooth
- externalLogId
- deviceId
- deviceName
- diveDate
- entryTime
- exitTime
- totalDiveTime
- maxDepth
- avgDepth
- waterTemperature
- gpsLocation
- entryLocation
- exitLocation
- divePointId
- divePointName
- heartRate
- diveProfileGraph
- equipmentInfo
- buddyName
- memo
- weather
- visibility
- currentStrength
- certificationLevel
- media
- tags
- aiSummary
- aiCaption
- isPublic
- visibilityType
  - public
  - followers
  - private
- syncStatus
- createdAt
- updatedAt

---

# 8. 설정 화면에 “DiveLog 관리” 메뉴 추가

설정 화면에 아래 메뉴를 추가한다.

설정
- 프로필 설정
- 계정 설정
- 알림 설정
- 공개 범위 설정
- 외부 서비스 연동
- DiveLog 관리
- 자격증 관리
- AI 설정
- 앱 설정

DiveLog 관리 메뉴 기능:

- Garmin 연결 관리
- Suunto 연결 관리
- Shearwater Cloud 연결 관리
- Bluetooth 기기 관리
- 자동 동기화 ON/OFF
- 마지막 동기화 시간 표시
- 동기화 실패 로그 보기
- 수동 로그 가져오기
- 가져온 로그 목록 보기
- 로그 선택 후 상세 편집

---

# 9. DiveLog 관리 화면

화면명:

- DiveLogManagementScreen

구성:

상단:
- 제목: DiveLog 관리
- 전체 동기화 버튼
- 연결 상태 표시

연동 서비스 카드:
- Garmin
- Suunto
- Shearwater Cloud
- Bluetooth

각 카드 표시 정보:
- 연결 상태
- 마지막 동기화 시간
- 동기화 버튼
- 연결 해제 버튼

DiveLog 리스트:
- 다이빙 날짜
- 포인트 이름
- 최대 수심
- 총 다이빙 시간
- 로그 출처
- 동기화 상태
- 공개 여부
- 편집 가능 표시

---

# 10. DiveLog 상세 편집 기능

사용자가 가져온 로그를 선택하면 상세 편집 화면으로 이동한다.

화면명:

- DiveLogDetailScreen
- DiveLogEditScreen

수정 가능 항목:

- 대표 사진 업로드
- 수중 사진 추가
- 영상 업로드
- 메모 작성
- 버디 이름 입력
- 다이빙 포인트 수정
- 입수 위치 수정
- 출수 위치 수정
- 날씨 정보 수정
- 시야 상태 입력
- 조류 상태 입력
- 장비 정보 입력
- 태그 입력
- 공개 범위 설정
- SNS 공유 여부 설정
- AI 요약 생성
- AI 캡션 생성

처리 방안:

- 외부에서 가져온 원본 로그 값은 보호
- 사용자가 추가 입력한 데이터는 editable fields로 분리 저장
- 원본 로그 데이터와 사용자 편집 데이터를 병합해서 화면 표시
- 저장 시 updatedAt 갱신
- 미디어는 Cloudinary 업로드 후 URL 저장
- 사진 업로드 실패 시 로컬 임시 상태 표시
- 편집 중 이탈 시 저장 확인 모달 표시

---

# 11. Cloudinary 미디어 업로드

Cloudinary를 사용해서 사진과 영상을 저장한다.

기능:

- 프로필 이미지 업로드
- 피드 이미지 업로드
- 릴스 영상 업로드
- 다이빙 로그 대표 이미지 업로드
- 다이빙 로그 사진 여러 장 업로드
- 다이빙 로그 영상 업로드
- 이미지 자동 압축
- 썸네일 생성
- CDN URL 저장

처리 방안:

- cloudinaryService.ts 생성
- uploadImage()
- uploadVideo()
- generateThumbnail()
- deleteMedia()
- 업로드 진행률 표시
- 업로드 실패 시 재시도
- 업로드 완료 후 media 배열에 저장

---

# 12. PADI / SSI 자격증 관리

자격증 인증 기능을 추가한다.

연동 또는 관리 대상:

- PADI
- SSI

기능:

- 자격증 등록
- 자격증 이미지 업로드
- 자격증 번호 입력
- 발급 기관 선택
- 발급일 입력
- 만료일 입력
- 인증 상태 관리
- 프로필에 다이버 레벨 뱃지 표시

상태:

- 미등록
- 검토중
- 인증완료
- 반려

처리 방안:

- Certification 모델 생성
- certificationService.ts 생성
- 자격증 이미지는 Cloudinary 업로드
- 관리자 검토를 고려한 status 필드 포함
- 프로필에서는 인증완료 상태만 뱃지 표시

---

# 13. Firebase Cloud Messaging 알림

푸시 알림 기능을 추가한다.

알림 종류:

- 좋아요 알림
- 댓글 알림
- 팔로우 알림
- 다이빙 포인트 날씨 경고
- 다이빙 일정 알림
- 로그 동기화 완료 알림
- 로그 동기화 실패 알림
- Bluetooth 연결 실패 알림
- 자격증 인증 상태 알림

설정 화면에서 ON/OFF 가능해야 한다.

처리 방안:

- notificationService.ts 생성
- FCM 토큰 저장
- 사용자별 알림 설정 저장
- 알림 타입별 ON/OFF 관리
- 앱 foreground/background 상태 처리
- 권한 거부 시 설정 이동 안내

---

# 14. OpenAI API AI 기능

OpenAI API를 사용해서 AI 기능을 추가한다.

기능:

- 다이빙 로그 자동 요약
- 해양 날씨 기반 위험도 설명
- 다이빙 포인트 추천 이유 생성
- 게시글 캡션 추천
- 초보자 안내 문구 생성
- 로그 기반 위험 패턴 분석

예시:

“이번 다이빙은 최대 수심 18m, 총 42분 동안 진행되었습니다. 수온은 22℃로 안정적이었고 평균 수심은 초급자에게 적절한 수준입니다.”

처리 방안:

- aiService.ts 생성
- generateDiveLogSummary()
- generateDiveCaption()
- generateMarineRiskDescription()
- recommendDivePoint()
- AI 결과는 사용자가 수정 가능하게 처리
- API 실패 시 기본 템플릿 문구 표시
- AI 기능 ON/OFF 설정 제공

---

# 15. Settings 화면 추가 항목

설정 화면에 아래 메뉴를 반영한다.

외부 서비스 연동:
- Google Maps 상태
- Stormglass API 상태
- Garmin 연결
- Suunto 연결
- Shearwater Cloud 연결
- Instagram 공유 연결
- PADI 자격증 등록
- SSI 자격증 등록

DiveLog 관리:
- 로그 동기화 관리
- Bluetooth 기기 관리
- 가져온 로그 관리
- 자동 동기화 설정
- 동기화 실패 기록

알림 설정:
- 해양 날씨 경고 알림
- 로그 동기화 알림
- 다이빙 일정 알림
- Bluetooth 연결 알림
- 자격증 인증 알림

미디어 설정:
- 이미지 자동 압축
- 영상 업로드 품질
- 캐시 삭제

AI 설정:
- AI 로그 요약 사용 여부
- AI 포인트 추천 사용 여부
- AI 캡션 추천 사용 여부
- AI 위험도 설명 사용 여부

---

# 16. 추천 폴더 구조

/services
- googleMapService.ts
- stormglassService.ts
- authService.ts
- instagramShareService.ts
- garminService.ts
- suuntoService.ts
- shearwaterService.ts
- bluetoothDiveService.ts
- diveComputerAdapter.ts
- diveLogSyncService.ts
- certificationService.ts
- notificationService.ts
- cloudinaryService.ts
- aiService.ts

/models
- DivePoint.ts
- MarineWeather.ts
- DiveLog.ts
- ExternalDiveLog.ts
- DiveDevice.ts
- DeviceInfo.ts
- Certification.ts
- UserIntegration.ts
- NotificationSetting.ts
- MediaFile.ts

/screens
- SettingsScreen.tsx
- IntegrationSettingsScreen.tsx
- MarineWeatherScreen.tsx
- DiveLogManagementScreen.tsx
- DiveLogDetailScreen.tsx
- DiveLogEditScreen.tsx
- DiveLogSyncScreen.tsx
- BluetoothDeviceScreen.tsx
- CertificationScreen.tsx
- NotificationSettingsScreen.tsx
- AISettingsScreen.tsx

/components
- SettingSection.tsx
- SettingItem.tsx
- ToggleItem.tsx
- IntegrationStatusCard.tsx
- WeatherStatusCard.tsx
- DiveLogCard.tsx
- DiveLogMediaUploader.tsx
- CertificationBadge.tsx
- BluetoothDeviceCard.tsx
- SyncStatusBadge.tsx

---

# 17. 개발 방식

반드시 아래 순서로 개발해줘.

1단계:
- 모델 정의
- mock data 생성
- 설정 화면 메뉴 구조 추가
- DiveLog 관리 화면 UI 생성

2단계:
- DiveLog 리스트/상세/편집 화면 구현
- 사진/영상 업로드 mock 처리
- 로그 공개 범위 설정 구현

3단계:
- Stormglass API service layer 구현
- 해양 날씨 화면 구현
- 위험도 계산 로직 구현

4단계:
- 외부 API 로그 동기화 구조 구현
- Garmin / Suunto / Shearwater service mock 구현
- 공통 DiveLog 변환 로직 구현

5단계:
- Bluetooth BLE 구조 구현
- 기기 검색/연결/동기화 mock 구현
- Adapter 패턴 적용

6단계:
- Cloudinary 업로드 연동
- Firebase 알림 연동
- Instagram 공유 기능 연동

7단계:
- OpenAI API 연동
- AI 요약/캡션/위험도 설명 기능 구현

8단계:
- 실제 API Key 환경변수 연결
- 에러 처리
- 로딩 상태
- 권한 처리
- 예외 상황 처리
- 최종 테스트

---

# 18. 예외 처리 필수

아래 상황을 반드시 처리해줘.

- API Key 없음
- 네트워크 오류
- Stormglass 응답 없음
- 지도 권한 거부
- 위치 권한 거부
- Bluetooth 권한 거부
- Bluetooth 기기 연결 실패
- 로그 다운로드 실패
- 중복 로그 감지
- Cloudinary 업로드 실패
- OpenAI API 실패
- FCM 권한 거부
- 외부 계정 연결 만료
- 사용자가 편집 중 화면 이탈
- 공개 범위 미설정
- 미디어 업로드 중 앱 종료

---

# 19. 최종 결과물

아래 결과물을 모두 만들어줘.

- 전체 기능 개발 플랜
- 데이터 모델
- mock data
- service layer 코드
- 설정 화면 UI
- DiveLog 관리 화면
- DiveLog 상세 화면
- DiveLog 편집 화면
- Bluetooth 기기 관리 화면
- Stormglass 해양 날씨 화면
- 외부 서비스 연동 상태 화면
- 자격증 관리 화면
- 알림 설정 화면
- AI 설정 화면
- 공통 에러 처리 구조
- 권한 요청 처리 구조
- 실제 API 연결이 쉬운 코드 구조

기술 기준:

- React Native 기준으로 작성
- TypeScript 사용
- 컴포넌트 기반 구조
- service layer 분리
- mock data 기반으로 먼저 동작 가능하게 구현
- 실제 API 연결 지점은 TODO 주석으로 명확히 표시
- UI는 모바일 앱 기준
- 디자인은 딥블루, 아쿠아, 화이트 기반
- 카드형 섹션 UI
- 아이콘 + 텍스트 + 우측 화살표 구조
- 토글 스위치 사용
- 로딩/빈 상태/에러 상태 모두 포함


추가 요구사항:
Divergram 앱 서비스 운영에 필요한 법적 문서와 정책 화면도 함께 생성해줘.
아래 문서는 한국 서비스 기준 + 글로벌 서비스 확장 가능성을 고려해서 작성해줘.

# 20. 법적 문서 및 정책 시스템

아래 문서를 모두 생성해줘.

필수 문서:

- 이용약관 (Terms of Service)
- 개인정보처리방침 (Privacy Policy)
- 위치정보 이용약관
- 위치정보 처리방침
- 커뮤니티 운영정책
- 콘텐츠 업로드 정책
- 저작권 정책
- 청소년 보호 정책
- 다이빙 안전 면책 조항
- 의료/안전 책임 고지
- AI 기능 안내 및 책임 제한
- 외부 API 연동 고지
- Bluetooth 기기 연동 고지
- 쿠키 정책
- 데이터 보관 및 삭제 정책
- 계정 삭제 정책
- 신고 및 제재 정책
- 불법 콘텐츠 금지 정책
- 이용자 신고 처리 정책
- 개인정보 제3자 제공 고지
- 개인정보 국외 이전 고지
- 마케팅 정보 수신 동의
- 푸시 알림 수신 동의
- 만 14세 이상 이용 안내
- UGC(User Generated Content) 정책

---

# 21. Divergram 서비스 특화 법적 내용

Divergram은 다이빙 플랫폼이므로 아래 내용을 반드시 포함해줘.

다이빙 안전 관련:

- 다이빙은 위험한 스포츠라는 점 고지
- 사용자의 안전 책임은 본인에게 있다는 조항
- 해양 정보는 참고용이라는 고지
- Stormglass API 데이터 오차 가능성 고지
- 기상/조류 데이터 정확도 보장 불가 고지
- 앱 추천 정보로 인한 사고 책임 제한
- 응급 상황 시 구조를 보장하지 않는다는 조항

DiveLog 관련:

- 외부 장비 데이터 오차 가능성
- Bluetooth 데이터 누락 가능성
- 로그 데이터 손실 가능성
- 로그 백업 책임 범위
- 자동 동기화 실패 가능성

SNS/콘텐츠 관련:

- 사용자가 업로드한 사진/영상의 저작권 책임
- 수중 촬영 관련 초상권 책임
- 불법 촬영 금지
- 음란/폭력 콘텐츠 금지
- 허위 정보 금지
- 위험 다이빙 조장 금지

AI 기능 관련:

- OpenAI 기반 결과는 참고용이라는 점
- AI 추천의 정확도 보장 불가
- AI 생성 설명 오류 가능성
- AI 위험도 분석은 참고용이라는 점

위치정보 관련:

- GPS 위치 수집 안내
- 다이빙 위치 저장 안내
- 위치 기반 추천 기능 설명
- 위치 공개 범위 설명

---

# 22. 개인정보 처리 항목

개인정보처리방침에는 아래 수집 항목을 반영해줘.

수집 정보:

- 이메일
- 닉네임
- 프로필 이미지
- 휴대폰 번호
- 로그인 연동 정보
- GPS 위치
- 다이빙 위치
- DiveLog 데이터
- 장비 정보
- Bluetooth 기기 정보
- IP 주소
- 기기 정보
- 푸시 토큰
- 사진 및 영상
- 자격증 정보
- Instagram 링크
- AI 기능 사용 데이터

외부 연동 서비스:

- Google
- Apple
- Kakao
- Facebook
- Stormglass
- Garmin
- Suunto
- Shearwater
- Cloudinary
- Firebase
- OpenAI

---

# 23. 법적 문서 화면 구성

앱 내부에 아래 화면도 생성해줘.

화면 목록:

- TermsScreen
- PrivacyPolicyScreen
- LocationPolicyScreen
- CommunityPolicyScreen
- SafetyDisclaimerScreen
- AIUsagePolicyScreen

설정 화면 메뉴 추가:

설정
- 이용약관
- 개인정보처리방침
- 위치정보 이용약관
- 커뮤니티 운영정책
- 안전 고지
- AI 기능 안내
- 오픈소스 라이선스

---

# 24. 회원가입 동의 절차

회원가입 시 아래 동의 UI를 추가해줘.

필수 동의:

- 이용약관 동의
- 개인정보처리방침 동의
- 위치정보 이용 동의
- 만 14세 이상 확인

선택 동의:

- 마케팅 정보 수신 동의
- 푸시 알림 수신 동의

기능:

- 전체 동의
- 개별 동의
- 문서 상세보기
- 필수 동의 누락 시 가입 불가

처리 방안:

- Consent 모델 생성
- 동의 버전 관리
- 동의 일시 저장
- 회원가입 시 동의 이력 저장
- 정책 업데이트 시 재동의 처리 가능 구조 설계

---

# 25. 데이터 삭제 및 계정 삭제 정책

기능:

- 계정 삭제 요청
- 삭제 대기 기간
- 완전 삭제 처리
- 로그 데이터 삭제
- 미디어 삭제
- 외부 연동 해제

처리 방안:

- soft delete 구조
- 복구 가능 기간 설정
- Cloudinary 미디어 삭제 연동
- 외부 OAuth 토큰 제거
- Bluetooth 연결 정보 삭제
- AI 생성 데이터 삭제

---

# 26. 신고 및 제재 시스템

커뮤니티 운영을 위해 신고 시스템도 추가해줘.

신고 대상:

- 사용자
- 게시글
- 댓글
- DiveLog
- 사진/영상

신고 사유:

- 음란물
- 폭력성
- 혐오 표현
- 허위 정보
- 위험 행위 조장
- 저작권 침해
- 사칭
- 스팸

제재 상태:

- 경고
- 임시 제한
- 업로드 제한
- 계정 정지
- 영구 정지

---

# 27. 추가 모델 구조

/models

- Consent.ts
- PolicyDocument.ts
- Report.ts
- ModerationAction.ts
- LegalAgreement.ts

---

# 28. 추가 화면 구조

/screens

- TermsScreen.tsx
- PrivacyPolicyScreen.tsx
- LocationPolicyScreen.tsx
- CommunityPolicyScreen.tsx
- SafetyDisclaimerScreen.tsx
- AIUsagePolicyScreen.tsx
- ConsentScreen.tsx
- ReportScreen.tsx

---

# 29. 정책 문서 작성 기준

문서는 아래 기준으로 작성해줘.

- 한국 개인정보보호법 기준 반영
- 위치정보법 고려
- 앱스토어 심사 대응 가능 수준
- Google Play 정책 대응
- Apple App Store 정책 대응
- SNS 서비스 운영 기준 반영
- 글로벌 서비스 확장 가능 구조
- 다이빙 안전 관련 책임 제한 포함
- AI 기능 책임 제한 포함

문체:

- 실제 서비스 수준의 정식 문서 형태
- 사용자 친화적인 문체
- 너무 딱딱하지 않게
- 모바일 화면에서 읽기 쉬운 구조
- 제목 / 소제목 / 리스트 구조 적용

---

# 30. 최종 결과물에 추가

최종 결과물에 아래를 추가해줘.

- 이용약관 전문
- 개인정보처리방침 전문
- 위치정보 이용약관 전문
- 커뮤니티 운영정책 전문
- 다이빙 안전 면책 조항
- AI 기능 안내 문서
- 회원가입 동의 화면
- 정책 화면 UI
- 신고 기능 UI
- 정책 버전 관리 구조
- 동의 이력 저장 구조
- 계정 삭제 처리 구조
- 신고 및 제재 구조


우리가 앞으로 작업해야할 내용들이야 체크리스트 만들고 하나씩처리될때마다 표시해줘 위내용은 하나라도 빠지면안되 원문을 그대로 저장하고 그에따른 플랜을 만들고 처리해줘
