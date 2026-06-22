# Divergram 서비스 분리 체크리스트

기준일: 2026-06-22

## 완료

- [x] 로컬 루트를 `divergram_app`에서 `divergram`으로 변경
- [x] 앱을 `app/`, API를 `api/`, 관리자를 `adm/`, 웹을 `web/`으로 분리
- [x] 서비스별 `package.json`, lockfile, `.env` 및 공개용 `.env.example` 분리
- [x] API 비밀값이 `app/`, `adm/`, `web/` 환경 파일에 포함되지 않도록 정리
- [x] PostgreSQL 마이그레이션과 seed 스크립트를 `api/`로 이동
- [x] Supabase 디렉터리, 마이그레이션, 문서 및 코드 참조 제거
- [x] 웹에서 서버, DB seed, Capacitor, 관리자 내부 화면 잔재 제거
- [x] 구형 Nginx 루트 배포 CI를 서비스별 검증 CI로 교체
- [x] 앱 lint/TypeScript, API 문법, 관리자 빌드, 웹 lint/TypeScript/빌드 검증
- [x] 운영 서버를 `/home/divergram/api`, `adm`, `web`으로 분리
- [x] PM2 실행 경로를 서비스 디렉터리로 통일
- [x] 운영 API, 관리자, 웹 내·외부 헬스체크 200 확인
- [x] 기존 운영 트리를 타임스탬프 백업 후 격리
- [x] 저장소 내 Android 서비스 계정 JSON 제거 및 재유입 차단

## 운영 확인 필요

- [ ] 노출 이력이 있는 Google 서비스 계정 키 폐기 및 새 키 발급
- [ ] `npm audit` 취약점 검토: API 3건, 관리자 4건, 웹 9건
- [ ] 관리자 번들(약 603KB) 코드 분할
- [ ] 웹 React Hook 경고 22건 순차 해소
- [ ] 웹/관리자 Browserslist 데이터 갱신
- [ ] 로컬 API용 별도 PostgreSQL 접속 환경 구성
- [ ] 서비스별 배포 워크플로(API/관리자/웹)를 검증 CI와 분리해 추가
- [ ] 운영 로그 회전 및 오래된 PM2 오류 로그 정리

## 운영 경로와 복구

- API: `/home/divergram/api`
- 관리자: `/home/divergram/adm`
- 웹: `/home/divergram/web`
- 앱: 서버 미배포, 로컬 `app/` 및 앱스토어 빌드만 사용
- 분리 전 백업: `/home/divergram/.backup/service-split-20260622_231213`

복구가 필요하면 PM2를 중지하고 백업의 `legacy-live-tree` 또는 압축본을 복원한 뒤, 백업된 `pm2-dump.pm2`를 사용한다.
