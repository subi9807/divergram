# divergram-api

Divergram 백엔드를 별도 디렉토리로 분리한 API 서버.

## 경로
- `/Users/seowoo/Desktop/Works/divergram-api`

## 실행
```bash
cd /Users/seowoo/Desktop/Works/divergram-api
cp .env.server.example .env.server
npm install
npm run start
```

## 필수 환경변수
- `JWT_SECRET` (32자 이상)
- `ADMIN_API_KEY` (16자 이상)
- DB 연결 값 (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`)

## 푸시 발송 설정
- `FCM_SERVICE_ACCOUNT_JSON` 또는 `FCM_SERVICE_ACCOUNT_PATH`
- 전체 사용자 브로드캐스트 토픽 기본값은 `all_users`

앱은 설치 후 최초 실행 시 푸시 토큰을 서버에 등록하고, `all_users` 토픽에도 자동 구독됩니다.
관리자 `푸시 발송` 화면의 전체 발송은 이 토픽과 개별 토큰을 함께 사용합니다.

## 업로드 API
- `POST /api/uploads`
- Auth: `Authorization: Bearer <token>`
- Body: `multipart/form-data` (`file`)
- Response: `{ ok: true, url, file }`

정적 파일 서빙:
- `GET /uploads/<filename>`

업로드 디렉토리:
- 기본 `uploads/` (프로젝트 루트)
- `UPLOAD_DIR`로 변경 가능
