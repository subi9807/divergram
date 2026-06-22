# API Structure Plan

## 목표
- server/index.js 단일 파일 분리
- 기능별 라우트 모듈화 + 공통 미들웨어 분리

## 단계
1. health 라우트 분리 ✅
2. auth 라우트 분리 (signup/login/session/me/email verify)
3. admin 라우트 분리 (health/stats/map/growth/jobs)
4. push/chat 라우트 분리
5. docs/openapi 분리

## 공통 모듈
- middleware/auth.js
- middleware/rateLimit.js
- utils/response.js
- db/pool.js
