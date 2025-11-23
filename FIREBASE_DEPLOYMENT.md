# Firebase 배포 가이드

이 문서는 Divergram을 Firebase Hosting에 배포하는 방법을 설명합니다.

## 사전 준비

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: divergram)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

### 2. Firebase CLI 로그인

```bash
npx firebase login
```

브라우저가 열리면 Google 계정으로 로그인합니다.

## 프로젝트 설정

### 1. Firebase 프로젝트 연결

`.firebaserc` 파일을 수정하여 Firebase 프로젝트 ID를 설정합니다:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

`your-project-id`를 실제 Firebase 프로젝트 ID로 변경하세요.

Firebase 프로젝트 ID는 Firebase Console의 프로젝트 설정에서 확인할 수 있습니다.

### 2. 환경 변수 설정

Firebase Hosting에서 환경 변수는 빌드 시점에 주입되어야 합니다.

**로컬 빌드 시:**

프로젝트 루트의 `.env` 파일에 환경 변수를 설정합니다:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 배포 방법

### 방법 1: 수동 배포 (권장)

1. **프로젝트 빌드**

```bash
npm run build
```

2. **Firebase에 배포**

```bash
npx firebase deploy --only hosting
```

또는 한 번에 실행:

```bash
npm run firebase:deploy
```

### 방법 2: 미리보기 채널 배포

배포 전에 미리보기 채널에서 테스트:

```bash
npm run firebase:preview
```

이 명령은 임시 미리보기 URL을 생성합니다. 예: `https://your-project-id--preview-xxxx.web.app`

### 방법 3: GitHub Actions를 통한 자동 배포

`.github/workflows/firebase-hosting.yml` 파일을 생성하여 자동 배포 설정:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci
        env:
          NODE_ENV: development

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          NODE_ENV: production

      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

**GitHub Secrets 설정:**

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 secrets 추가:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` (Firebase Console에서 생성)

## Firebase 설정 파일 설명

### firebase.json

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

**주요 설정:**
- `public`: 배포할 디렉토리 (Vite 빌드 결과물이 저장되는 `dist` 폴더)
- `rewrites`: SPA 라우팅을 위해 모든 요청을 index.html로 리다이렉트
- `headers`: 정적 파일 캐싱 설정 (1년)

### .firebaserc

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Firebase 프로젝트 ID 설정 파일입니다.

## 배포 확인

배포가 완료되면 다음 URL에서 앱을 확인할 수 있습니다:

- **기본 URL**: `https://your-project-id.web.app`
- **커스텀 도메인**: Firebase Console에서 설정 가능

## 커스텀 도메인 설정

1. Firebase Console → Hosting
2. "도메인 추가" 클릭
3. 도메인 이름 입력
4. DNS 레코드 설정 (A 또는 CNAME)
5. 설정 완료 후 SSL 자동 적용

## 롤백 (이전 버전으로 되돌리기)

Firebase Console → Hosting → 배포 기록에서 이전 버전을 선택하여 롤백할 수 있습니다.

또는 CLI를 사용:

```bash
npx firebase hosting:rollback
```

## 문제 해결

### 1. 빌드 실패

```bash
npm ci
NODE_ENV=production npm run build
```

### 2. 환경 변수가 적용되지 않음

- `.env` 파일이 프로젝트 루트에 있는지 확인
- 환경 변수가 `VITE_` 접두사로 시작하는지 확인
- 빌드를 다시 실행

### 3. 404 에러

- `firebase.json`의 `rewrites` 설정 확인
- `dist` 폴더에 `index.html`이 있는지 확인

### 4. 캐싱 문제

브라우저 캐시를 삭제하거나 시크릿 모드에서 테스트하세요.

## 비용

Firebase Hosting 무료 플랜:
- 저장소: 10GB
- 전송량: 월 360MB
- 커스텀 도메인 및 SSL 무료

무료 한도를 초과하면 사용량에 따라 과금됩니다.

## 추가 리소스

- [Firebase Hosting 문서](https://firebase.google.com/docs/hosting)
- [Vite 배포 가이드](https://vitejs.dev/guide/static-deploy.html)
- [Firebase Console](https://console.firebase.google.com/)

## 유용한 명령어

```bash
npm run build                    # 프로덕션 빌드
npm run firebase:deploy          # 빌드 후 Firebase에 배포
npm run firebase:preview         # 미리보기 채널에 배포
npx firebase hosting:channel:list    # 활성 채널 목록
npx firebase hosting:channel:delete preview  # 미리보기 채널 삭제
```

---

**Happy Deploying! 🚀**
