# Divergram 🤿

**Divergram**은 다이버들을 위한 소셜 미디어 플랫폼입니다. Instagram 스타일의 직관적인 UI로 다이빙 로그를 공유하고, 다른 다이버들과 소통할 수 있습니다.

## 주요 기능

### 📸 다이빙 로그 공유
- **멀티 미디어 업로드**: 이미지와 비디오를 최대 10개까지 업로드
- **드래그 앤 드롭 순서 변경**: 직관적인 드래그 앤 드롭으로 미디어 순서 조정
- **YouTube/Vimeo 지원**: YouTube 및 Vimeo 동영상 URL을 자동으로 임베드
- **상세 다이빙 정보 기록**:
  - 다이빙 타입 (스쿠버/프리다이빙)
  - 다이빙 날짜
  - 최대 수심, 수온, 가시거리
  - 다이빙 시간 (스쿠버 전용)
  - 다이빙 사이트 및 위치
  - 버디 태그

### 🌊 소셜 기능
- **피드**: 팔로우한 사용자들의 다이빙 로그 확인
- **탐색**: 새로운 다이버와 멋진 다이빙 스팟 발견
- **Reels**: 짧은 다이빙 비디오 감상
- **스토리**: 24시간 동안 표시되는 임시 콘텐츠
- **좋아요 & 댓글**: 다른 다이버들과 소통
- **저장**: 나중에 보고 싶은 게시물 저장
- **공유**: 게시물을 다른 사용자와 공유

### 📍 위치 기반 기능
- **위치 태그**: 게시물에 다이빙 위치 추가
- **위치별 피드**: 특정 위치의 모든 다이빙 로그 확인
- **Google Maps 통합**: 다이빙 스팟을 지도에서 확인

### 👤 프로필 관리
- **프로필 편집**: 아바타, 이름, 자기소개 수정
- **다이빙 통계**: 게시물, 팔로워, 팔로잉 수 확인
- **게시물 그리드**: Masonry 레이아웃으로 나만의 다이빙 로그 갤러리

### 💬 소통 기능
- **멘션**: @username으로 다른 사용자 태그
- **알림**: 좋아요, 댓글, 팔로우, 멘션 알림
- **메시지**: 다른 다이버들과 1:1 대화 (준비 중)

### 🎨 사용자 경험
- **다크 모드**: 시스템 설정에 따른 자동 다크 모드
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 최적화
- **무한 스크롤**: 자동으로 더 많은 콘텐츠 로드
- **실시간 업데이트**: 새로운 콘텐츠 즉시 반영

## 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빠른 빌드 도구
- **Tailwind CSS** - 유틸리티 CSS 프레임워크
- **Lucide React** - 아이콘 라이브러리

### Backend & Database
- **Supabase** - Backend as a Service
  - PostgreSQL 데이터베이스
  - 인증 시스템
  - 스토리지 (이미지/비디오)
  - Row Level Security (RLS)
  - 실시간 구독

### 주요 라이브러리
- `(removed)` - Supabase 클라이언트
- `lucide-react` - 아이콘 컴포넌트

## 시작하기

### 필수 요구사항
- Node.js 18 이상
- npm 또는 yarn
- Supabase 계정

### 설치

1. **저장소 클론**
```bash
git clone <repository-url>
cd divergram
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**

`.env.local` / `.env.server` 파일을 프로젝트 루트에 생성하고 다음 내용을 추가합니다:

```env
# .env.local
VITE_API_BASE_URL=http://127.0.0.1:4000

# .env.server
# Supabase Postgres 연결 문자열 (권장)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/postgres?sslmode=require
PGSSL=true
```

`DATABASE_URL`이 없으면 기존 `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD` 값을 사용합니다.

4. **데이터베이스 마이그레이션**

DB 관리 도구의 SQL 에디터에서 `db/migrations` 폴더의 마이그레이션 파일들을 순서대로 실행합니다.

5. **개발 서버 실행**
```bash
npm run dev
```

브라우저에서 `http://localhost:5173`을 열어 앱을 확인할 수 있습니다.

### 빌드

프로덕션 빌드를 생성하려면:

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

### 미리보기

빌드된 앱을 로컬에서 미리보기:

```bash
npm run preview
```

### 배포

실운영 배포는 `https://divergram.com` 기준 인프라에서 진행합니다.
(Firebase Hosting 기반 배포는 사용하지 않습니다.)

## 프로젝트 구조

```
divergram/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── Auth.tsx        # 로그인/회원가입
│   │   ├── Feed.tsx        # 메인 피드
│   │   ├── CreatePost.tsx  # 게시물 작성
│   │   ├── Profile.tsx     # 사용자 프로필
│   │   ├── Explore.tsx     # 탐색 페이지
│   │   ├── Reels.tsx       # Reels 페이지
│   │   ├── Stories.tsx     # 스토리 컴포넌트
│   │   ├── PostDetail.tsx  # 게시물 상세
│   │   ├── Notifications.tsx # 알림
│   │   └── ...
│   ├── contexts/           # React Context
│   │   └── AuthContext.tsx # 인증 상태 관리
│   ├── lib/               # 라이브러리 설정
│   │   └── internal-db.ts # Internal DB 클라이언트
│   ├── utils/             # 유틸리티 함수
│   │   ├── videoUtils.ts  # 비디오 URL 처리
│   │   ├── timeFormat.ts  # 시간 포맷팅
│   │   └── googleMaps.ts  # Google Maps 통합
│   ├── App.tsx            # 메인 앱 컴포넌트
│   ├── main.tsx           # 앱 엔트리 포인트
│   └── index.css          # 글로벌 스타일
├── db/
│   └── migrations/        # 데이터베이스 마이그레이션
├── public/                # 정적 파일
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 데이터베이스 스키마

### 주요 테이블

- **profiles** - 사용자 프로필 정보
- **posts** - 다이빙 로그 게시물
- **post_media** - 게시물의 미디어 파일 (이미지/비디오)
- **comments** - 댓글
- **likes** - 좋아요
- **follows** - 팔로우 관계
- **stories** - 스토리
- **story_views** - 스토리 조회 기록
- **notifications** - 알림
- **saved_posts** - 저장된 게시물
- **reports** - 신고

### 스토리지 버킷

- **avatars** - 프로필 이미지
- **diving-media** - 다이빙 사진
- **videos** - 다이빙 비디오
- **stories** - 스토리 미디어
- **reports** - 신고 증거 파일

## 주요 기능 구현 상세

### 드래그 앤 드롭 이미지 순서 변경

게시물 작성 시 멀티 미디어 업로드에서 드래그 앤 드롭으로 순서를 변경할 수 있습니다:

- 각 미디어에 순서 번호 표시
- 첫 번째 미디어에 "메인" 배지 표시
- 드래그 중 시각적 피드백 (투명도, 테두리, 크기 변화)
- 자동으로 `order_index` 업데이트

### YouTube/Vimeo 비디오 지원

YouTube나 Vimeo URL을 입력하면 자동으로 임베드 플레이어로 표시:

- YouTube: `youtube.com/watch`, `youtu.be`, `youtube.com/embed` 형식 지원
- Vimeo: `vimeo.com` URL 지원
- 일반 비디오 파일 (.mp4, .webm 등)은 HTML5 video 태그로 재생

### Row Level Security (RLS)

모든 테이블에 RLS 정책이 적용되어 보안이 강화되었습니다:

- 사용자는 자신의 데이터만 수정/삭제 가능
- 공개 데이터는 모든 사용자가 조회 가능
- 인증된 사용자만 콘텐츠 작성 가능
- `(select auth.uid())` 패턴으로 성능 최적화

## 보안

- **이메일/비밀번호 인증** - Supabase Auth 사용
- **Row Level Security** - 데이터베이스 레벨 보안
- **환경 변수** - API 키 안전하게 관리
- **파일 크기 제한** - 최대 50MB
- **신고 기능** - 부적절한 콘텐츠 신고

## 성능 최적화

- **이미지 최적화**: Supabase Storage의 이미지 변환 기능
- **무한 스크롤**: 10개씩 페이지네이션
- **RLS 성능**: `(select auth.uid())` 패턴으로 쿼리 최적화
- **인덱스 최적화**: 불필요한 인덱스 제거
- **코드 스플리팅**: Vite의 자동 코드 스플리팅

## 향후 개발 계획

- [ ] 실시간 메시지 기능
- [ ] 다이빙 로그 통계 대시보드
- [ ] 다이빙 인증서 관리
- [ ] 다이빙 장비 관리
- [ ] 다이빙 버디 찾기
- [ ] 다이빙 샵 리뷰
- [ ] 다국어 지원
- [ ] PWA (Progressive Web App)
- [ ] 모바일 앱 (React Native)

## 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 문의

프로젝트에 대한 문의사항이나 버그 리포트는 이슈를 통해 남겨주세요.

---

**Happy Diving! 🤿🌊**
