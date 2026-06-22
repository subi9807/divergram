# Divergram 관리자 대시보드 체크리스트

> 기준: 운영자가 실서비스에서 바로 사용할 수 있는지 여부를 확인한다.

| 항목 | 연결 데이터 | 상태 | 체크 |
|---|---|---:|---:|
| 대시보드 홈 | `/api/admin/health`, `/api/admin/stats`, `/api/admin/growth` | 완료 | [x] |
| 회원관리 | `/api/admin/users`, `/api/admin/users/:userId/block` | 완료 | [x] |
| 리조트관리 | `/api/admin/tables`, `/api/admin/table/app_profiles`, `/api/admin/map-points` | 완료 | [x] |
| 피드관리 | `/api/admin/table/app_posts`, `/api/admin/table/app_post_media`, `/api/admin/table/app_likes`, `/api/admin/table/app_comments` | 완료 | [x] |
| 릴스관리 | `/api/admin/table/app_posts`(릴스 플래그 기준), `/api/admin/table/app_post_media` | 완료 | [x] |
| 방문자통계 | `/api/admin/growth` | 완료 | [x] |
| 광고운영 | 광고 슬롯 UI + `/api/admin/ads` | 완료 | [x] |
| 지도포인트 | `/api/admin/map-points` | 완료 | [x] |
| 신고관리 | `/api/admin/reports`, `/api/admin/reports/:reportId/status` | 완료 | [x] |
| 자격증관리 | `/api/admin/certifications`, `/api/admin/certifications/:certificationId/status` | 완료 | [x] |
| 작업큐 | `/api/admin/jobs`, `/api/admin/jobs/dispatch` | 완료 | [x] |
| 운영키 보호 | 관리자 키 입력 필요 | 완료 | [x] |

## 운영 점검 순서
1. 관리자 키 입력
2. health/stats/growth 로드
3. 회원/리조트/피드/릴스 개수 확인
4. 신고/자격증/작업큐 확인
5. 지도 포인트 확인
6. 광고 슬롯은 운영 API 연결 상태를 계속 확인한다.

## 추가로 넣으면 좋은 기능
- 관리자 역할 권한 분리
- 콘텐츠 예약 발행
- 광고 계약/노출 이력
- 신고 이력 검색
- 운영 로그 CSV 다운로드
- 대시보드 지표 기간 필터
