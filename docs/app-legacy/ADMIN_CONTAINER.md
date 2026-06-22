# Divergram Admin Container

## 구성
- `api` : 기존 인증/API 서버 (포트 `4000`)
- `admin-web` : 관리자 웹앱 (포트 `5175`)

## 실행
```bash
cd /Users/seowoo/Desktop/Works/divergram
docker compose -f docker-compose.admin.yml up --build
```

## 접속
- Admin UI: http://127.0.0.1:5175

## 로그인 키
`.env.server`의 `ADMIN_API_KEY` 값을 Admin UI에 입력하면 통계 조회 가능.

## 참고
- 현재 Admin UI는 onub2b 스타일을 참고하기 위한 기본 레이아웃/토큰 구조만 반영.
- 다음 단계에서 onub2b 컴포넌트 체계(버튼/테이블/폼)로 세부 이식 가능.
