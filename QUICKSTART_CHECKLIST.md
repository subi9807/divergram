# Quickstart Checklist

## 실행 전
- PostgreSQL 준비됨
- `.env.server`가 로컬용 값인지 확인
- `.env.local` 존재 확인
- 루트 / admin 의존성 설치 완료

## 실행 순서
1. `bash run-local-api.sh`
2. `bash run-local-web.sh`
3. `bash run-local-admin.sh`

또는 macOS:

```bash
bash run-local-all.sh
```

## 빠른 확인
- API: `http://127.0.0.1:4000/api/health`
- Web: `http://127.0.0.1:5173`
- Admin: `http://127.0.0.1:5175`

## 로그인 테스트
- `npm run seed:local:auth`
- `admin@local.dev / Admin1234!`
- `user@local.dev / User1234!`
