# Divergram Workspace Split

> 목적: app / adm / api / www의 책임을 분리해 파일 혼선을 막고, 각 워크스페이스를 독립적으로 운영한다.

## 1. 역할 정의

| Workspace | 역할 | 주요 책임 |
|---|---|---|
| `divergram_app` | 사용자용 모바일 앱 | 피드, 탐색, 포인트 지도, 로그 작성, 프로필, 설정, 로그인/세션 |
| `divergram_adm` | 관리자 웹 콘솔 | 회원/리조트/피드/릴스/신고/자격증/광고/방문자 통계 운영 |
| `divergram_api` | 백엔드 API | 인증, 데이터, 관리자 API, 외부 연동, 푸시, 미디어, 동기화 |
| `divergram_www` | 공개 웹/정적 웹 | 공개 랜딩, 정적 웹 출력, 마케팅/안내 페이지 |

## 2. 현재 물리 위치

- 앱: `/Volumes/WD_Elements/Works/divergram_app`
- 관리자: `/Volumes/WD_Elements/Works/divergram_adm`
- API: `/Volumes/WD_Elements/Works/divergram_api`
- 공개 웹: `/Volumes/WD_Elements/Works/divergram_www`

## 3. 분리 원칙

1. 앱과 관리자 코드는 서로 import 하지 않는다.
2. 백엔드 코드는 `api` 밖에서 직접 수정하지 않는다.
3. 웹 정적 산출물은 `www`로 분리한다.
4. 운영 데이터와 테스트 데이터는 분리한다.
5. 각 워크스페이스는 자기 package.json / build / lint 기준을 가진다.

## 4. 현재 내려받은 소스 기준

- `divergram_adm`: 원격 `prod-server:/home/divergram/adm`
- `divergram_api`: 원격 `prod-server:/home/divergram/api`

## 5. 다음 작업 순서

1. `divergram_adm`에서 실제 운영 UI를 정리한다.
2. `divergram_api`에서 관리자/외부연동/API를 분리한다.
3. `www`는 `/Volumes/WD_Elements/Works/divergram_www`로 분리 완료 상태를 유지한다.
4. 각 워크스페이스별로 lint/build를 독립 실행한다.
