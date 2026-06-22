# Divergram services

서비스별 소스와 환경을 분리한 Divergram 모노레포입니다.

| 디렉터리 | 역할 | 운영 배치 |
| --- | --- | --- |
| `app/` | Expo 기반 iOS/Android 앱 | 앱스토어/플레이스토어 |
| `api/` | Express/PostgreSQL API 및 작업 큐 | `/home/divergram/api` |
| `adm/` | 운영 관리자 Vite 앱 | `/home/divergram/adm` |
| `web/` | 사용자 웹 Vite 앱 | `/home/divergram/web` |
| `docs/` | 공통 설계·진행 문서 | 선택 배포 |

각 서비스는 자체 `package.json`, lockfile, `.env`를 사용합니다. 루트 명령은 서비스 명령을 위임할 뿐 의존성을 공유하지 않습니다.

```bash
npm run dev:app
npm run dev:api
npm run dev:adm
npm run dev:web
npm run check
```

비밀값은 각 서비스의 `.env`에만 저장하고 Git에는 커밋하지 않습니다. Divergram은 자체 PostgreSQL/API를 사용하며 Supabase 런타임에 의존하지 않습니다.
