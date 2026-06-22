# Divergram Web

Divergram 사용자 웹 서비스입니다. API와 데이터베이스 코드는 `../api`에서 관리합니다.

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

환경변수는 `web/.env`의 `VITE_*` 공개 설정만 사용합니다. 인증과 데이터 처리는 `api.divergram.com`을 통해 수행합니다.
