# Divergram Local Setup

## A. Docker 없이 macOS 로컬 PostgreSQL 사용

```bash
bash scripts/setup-local-postgres-macos.sh
cp .env.server.local .env.server
```

기본 로컬 설정값:

- PGHOST=127.0.0.1
- PGPORT=5432
- PGDATABASE=divergram
- PGUSER=postgres
- PGPASSWORD=postgres

로컬 Postgres 비밀번호가 다르면 `.env.server` 값을 맞춰주세요.

## B. Docker로 DB 실행

```bash
docker compose -f docker-compose.local.yml up -d
cp .env.server.local .env.server
```

## C. 앱 실행

### API
```bash
bash run-local-api.sh
```

### Web
```bash
bash run-local-web.sh
```

### Admin
```bash
bash run-local-admin.sh
```

### 한 번에 실행 (macOS Terminal)
```bash
bash run-local-all.sh
```

## D. 시드 데이터 넣기

API가 한 번 떠서 스키마가 만들어진 뒤:

```bash
npm run seed:local
```

실제 로그인 가능한 테스트 계정까지 만들려면:

```bash
npm run seed:local:auth
```

## 주소

- API: http://127.0.0.1:4000
- Web: http://127.0.0.1:5173
- Admin: http://127.0.0.1:5175

## 참고

- `.env.server`가 운영용이면 백업 후 로컬용으로 바꾸세요.
- `server/index.js`의 `ensureSchema()`가 테이블을 일부 자동 생성합니다.
- seed 스크립트는 최소 테스트용 사용자/프로필/게시물만 넣습니다.
- `metabytree_idcserver.pub`처럼 공개키/인증 관련 파일은 이 저장소에 꼭 필요한지 점검하세요.
