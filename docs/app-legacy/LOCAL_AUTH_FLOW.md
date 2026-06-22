# Local Auth/Test Account Flow

## 준비

```bash
cp .env.server.local .env.server
cp .env.local .env.local.backup 2>/dev/null || true
```

API를 먼저 실행하세요.

```bash
bash run-local-api.sh
```

## 테스트 계정 시드

```bash
npm run seed:local
```

기본으로 생성되는 데이터:
- admin@local.dev / username: admin_local
- user@local.dev / username: user_local

## 주의

현재 seed 스크립트는 `app_users`, `app_profiles`, `app_posts` 최소 데이터만 넣습니다.
비밀번호 해시는 실제 로그인 가능한 해시가 아니라 개발용 placeholder 입니다.

즉, 로그인 API까지 실제로 테스트하려면 아래 둘 중 하나가 필요합니다.

1. 회원가입 API로 새 계정 생성
2. seed 스크립트를 실제 bcrypt 해시를 쓰도록 수정

## 추천 테스트 흐름

### 방법 1. 실제 회원가입 사용
1. API 실행
2. 웹 실행
3. 회원가입 화면에서 새 계정 생성
4. 로그인

### 방법 2. 관리/데이터 UI 테스트만 먼저
1. `npm run seed:local`
2. DB에 프로필/게시물 확인
3. API 응답/관리 UI 구조 테스트

## 실제 로그인 가능한 계정
이제 아래 명령으로 바로 만들 수 있습니다.

```bash
npm run seed:local:auth
```

생성 계정:
- `admin@local.dev` / `Admin1234!`
- `user@local.dev` / `User1234!`

자세한 확인 순서는 `LOGIN_SMOKE_CHECKLIST.md`를 보세요.
