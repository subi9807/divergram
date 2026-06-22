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
