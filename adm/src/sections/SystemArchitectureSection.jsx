import { useState } from 'react';

const LAYERS = [
  {
    number: '01',
    title: '사용자 접점',
    description: 'Divergram을 사용하는 모바일·웹·운영 화면',
    nodes: [
      { id: 'app', status: '구현', name: 'iOS · Android 앱', summary: 'Expo와 React Native 기반 사용자 앱', detail: '피드, 릴스, 다이빙 로그, 리조트 예약, 교육 신청, 채팅, 프로필, 라이선스와 Wallet 기능을 제공합니다.', links: ['HTTPS → api.divergram.com', 'FCM/APNs 푸시 수신', 'App Store · Google Play 배포'], evidence: 'app/src/ · app/app.json · app/eas.json' },
      { id: 'admin', status: '구현', name: '운영 관리자', summary: 'React와 Vite 기반 운영 콘솔', detail: '회원, 콘텐츠, 리조트, 예약, 교육, 광고, 알림, 통계와 시스템 운영 데이터를 관리합니다.', links: ['HTTPS → adm.divergram.com', 'Apache → 127.0.0.1:43102', '관리자 세션 → Express API'], evidence: 'adm/src/AdminApp.jsx · adm/src/sections/' },
      { id: 'web', status: '구현', name: '공개 웹', summary: '서비스 소개와 법적 정책 화면', detail: '서비스 안내, 정책 문서, 문의 접수와 앱 딥링크의 웹 진입점을 제공합니다.', links: ['divergram.com', 'app.divergram.com', 'Apache reverse proxy'], evidence: 'web/ · site/ · api/server/routes/websiteInquiries.js' },
    ],
  },
  {
    number: '02',
    title: 'IDC · 네트워크',
    description: '실제 운영 서버와 공개 트래픽 진입 경로',
    nodes: [
      { id: 'idc', status: '운영 확인', name: 'LG DACOM KIDC', summary: 'IBM 물리 서버 · 110.45.180.149', detail: 'DNS와 실서버를 확인한 결과 Naver Cloud가 아닌 KIDC IP 대역의 IBM System x3530 M4 물리 장비에서 운영됩니다. 가상화 감지 결과는 none입니다.', links: ['DNS A → 110.45.180.149', 'SSH → port 2922', 'Oracle Linux Server 8.10'], evidence: 'WHOIS KIDC-KR · /sys/class/dmi/id/* · hostnamectl' },
      { id: 'apache', status: '운영 확인', name: 'Apache · HTTPS', summary: 'TLS 종료와 도메인 reverse proxy', detail: '80/443 포트는 Apache httpd가 수신하며 도메인에 따라 내부 PM2 프로세스로 요청을 전달합니다.', links: ['api.divergram.com → :43100', 'adm.divergram.com → :43102', 'app.divergram.com → :43101'], evidence: '/etc/httpd/conf.d/*divergram*.conf' },
      { id: 'pm2', status: '운영 확인', name: 'PM2 · Node.js', summary: 'API, Worker, 관리자와 웹 프로세스', detail: 'PM2가 Divergram API, queue worker, 관리자, 사용자 웹과 사이트 프로세스를 지속 실행하고 로그와 재시작을 관리합니다.', links: ['divergram-api', 'divergram-worker', 'divergram-admin · divergram-web · site-divergram'], evidence: '/home/divergram/* · /root/.pm2/logs/' },
    ],
  },
  {
    number: '03',
    title: '애플리케이션 코어',
    description: '서비스 규칙, 보안과 백그라운드 작업',
    nodes: [
      { id: 'api', status: '구현', name: 'Express API', summary: 'Divergram 비즈니스 로직의 중심', detail: '인증, 데이터, 채팅, 리조트, 예약, 교육, 알림, 미디어, 번역, Wallet과 관리자 라우트를 한 API에서 제공합니다.', links: ['Apache :43100 → Express', 'Express → PostgreSQL', 'Express → 외부 서비스'], evidence: 'api/server/index.js · api/server/routes/' },
      { id: 'security', status: '구현', name: '인증 · 개인정보', summary: 'OAuth, JWT, 연락처 검증과 암호화', detail: 'Google, Apple, Meta OAuth와 관리자 세션을 처리합니다. 이메일·전화번호 변경 인증과 개인정보 암복호화 경계가 구현돼 있습니다.', links: ['OAuth provider → callback', 'Infobip OTP → 검증', 'DATA_ENCRYPTION_KEY → 연락처 암복호화'], evidence: 'api/server/routes/auth.js · profiles.js · api/server/lib/dataEncryption.js' },
      { id: 'worker', status: '운영 확인', name: 'Queue Worker', summary: '비동기 이벤트와 알림 처리', detail: '메시지와 백그라운드 작업을 API 요청과 분리해 처리하는 PM2 worker 프로세스가 운영 중입니다.', links: ['API → 작업 큐', 'Worker → 알림 전송', '작업 결과 → PostgreSQL'], evidence: 'api/server/queue-worker.js · PM2 divergram-worker' },
    ],
  },
  {
    number: '04',
    title: '데이터 · 미디어',
    description: '업무 데이터와 파일의 영속 저장',
    nodes: [
      { id: 'postgres', status: '운영 확인', name: 'PostgreSQL', summary: '회원과 서비스 업무 데이터', detail: '회원, 게시물, 채팅, 예약, 교육, 알림, 설정과 운영 이력을 저장합니다. 실서버에서 PostgreSQL 프로세스와 Divergram 연결을 확인했습니다.', links: ['Express pg Pool', 'TCP 5432', 'SQL migration · backup'], evidence: 'api/server/index.js · api/db/migrations/ · api/scripts/backup-database.sh' },
      { id: 'media', status: '운영 확인', name: '자체 미디어 저장소', summary: '/home/divergram/uploads/media', detail: '현재 기본 업로드 경로는 IDC 서버의 파일 시스템입니다. API가 공개 URL을 생성하고 Apache를 통해 미디어를 제공합니다.', links: ['앱 → /api/media', 'Multer → 서버 파일', '/uploads → HTTPS 공개'], evidence: 'api/server/routes/media.js · adminResortImports.js' },
      { id: 'cloudinary', status: '선택 기능', name: 'Cloudinary', summary: '서명 업로드 대체 경로', detail: '앱과 API에 Cloudinary 연동 코드가 있지만 운영 환경의 관련 키는 이번 점검에서 확인되지 않았습니다. 따라서 현재 기본 저장소로 보지 않습니다.', links: ['앱 → sign-upload API', '설정된 경우 Cloudinary CDN', '미설정 시 자체 업로드'], evidence: 'app/src/services/cloudinaryService.ts · api/server/routes/media.js' },
    ],
  },
  {
    number: '05',
    title: '외부 서비스',
    description: '푸시, 인증, SNS, 광고와 Wallet 연계',
    nodes: [
      { id: 'push', status: '운영 설정', name: 'Firebase FCM · APNs', summary: 'Android와 iOS 푸시 알림', detail: '서버가 FCM HTTP v1으로 메시지를 전송합니다. Android는 FCM, iOS는 Firebase에 연결된 APNs 경로를 사용하며 앱 내 알림 데이터는 DB와 함께 관리합니다.', links: ['API → Firebase FCM', 'FCM → Android', 'FCM → APNs → iOS'], evidence: 'api/server/lib/pushDelivery.js · app/src/lib/notifications.ts' },
      { id: 'infobip', status: '운영 설정', name: 'Infobip', summary: 'SMS · 이메일 인증과 사용량', detail: '이메일과 휴대폰 변경 시 OTP를 전송·검증하며 관리자에서 메시지 사용량과 USD 비용을 조회합니다.', links: ['프로필 변경 → OTP 발송', 'OTP 검증 → 연락처 저장', '관리자 → 사용량 조회'], evidence: 'api/server/routes/profiles.js · adminMessagingUsage.js' },
      { id: 'meta', status: '부분 설정', name: 'Meta 플랫폼', summary: 'Facebook · Instagram · Threads', detail: '세 플랫폼의 OAuth와 공유 코드가 있습니다. 운영 환경에서 Facebook과 Instagram 설정은 확인됐고 Threads 운영 키는 이번 점검에서 확인되지 않았습니다.', links: ['앱 → OAuth start', 'API → callback', '연결 계정 → 선택 게시'], evidence: 'api/server/routes/auth.js · app/src/lib/auth/{facebook,instagram,threads}.ts' },
      { id: 'wallet', status: '부분 설정', name: 'Apple · Google Wallet', summary: '라이선스, 회원번호와 QR 체크인', detail: 'Apple pkpass와 Google Wallet 발급 API, 앱의 라이선스 관리, 리조트 QR 체크인 라우트가 구현돼 있습니다. Google 운영 설정은 확인됐고 Apple 인증서 설정은 이번 점검에서 확인되지 않았습니다.', links: ['API → Wallet pass', 'Wallet → QR 제시', '리조트 앱 → 체크인 API'], evidence: 'api/server/routes/appleWallet.js · googleWallet.js · resortCheckins.js' },
      { id: 'admob', status: '구현', name: 'Google AdMob', summary: '피드와 리조트 광고 슬롯', detail: 'React Native Google Mobile Ads SDK와 광고 설정 계층을 통해 모바일 광고를 표시합니다.', links: ['앱 → AdMob SDK', '플랫폼별 광고 단위', '피드 · 리조트 슬롯'], evidence: 'app/src/config/ads.ts · app/src/features/feed/FeedAdSlot.native.tsx' },
      { id: 'ai', status: '운영 설정', name: 'OpenAI · 번역', summary: '콘텐츠 번역과 AI 생성', detail: '서버의 번역·AI 라우트가 외부 AI API를 호출하고 번역 캐시를 PostgreSQL에 저장합니다.', links: ['앱 → translation API', 'API → OpenAI', '결과 → translation cache'], evidence: 'api/server/routes/translations.js · aiGeneration.js · api/db/migrations/*translation_cache*' },
      { id: 'devices', status: '연동 기반', name: '다이브 컴퓨터', summary: 'Garmin · Suunto · Shearwater · BLE', detail: '공급사 연동 서비스와 BLE 어댑터, 외부 로그 정규화 모델이 구현돼 있습니다. 실제 사용 가능 여부는 공급사별 인증 상태에 따릅니다.', links: ['Device/BLE → app adapter', '공급사 API → integration route', '정규화 → 다이빙 로그'], evidence: 'app/src/services/*Service.ts · api/server/routes/integrations.js' },
      { id: 'sentry', status: '클라이언트 구현', name: 'Sentry', summary: '앱 오류와 릴리스 추적', detail: 'React Native Sentry SDK와 초기화 코드가 포함돼 있습니다. 실제 수집 여부는 빌드 환경의 DSN 설정에 따릅니다.', links: ['앱 오류 → Sentry', '환경·릴리스 태그', '민감정보 제거 필요'], evidence: 'app/src/lib/sentry.ts · @sentry/react-native' },
    ],
  },
  {
    number: '06',
    title: '빌드 · 배포',
    description: '소스에서 IDC와 앱 스토어까지 전달',
    nodes: [
      { id: 'server-deploy', status: '운영 확인', name: 'IDC 서버 배포', summary: 'SSH · PM2 · Apache · migration', detail: 'API와 웹 산출물을 /home/divergram 아래에 배치하고 DB migration, PM2 재시작과 health check를 수행합니다.', links: ['소스/빌드 → SSH 배포', 'migration → PostgreSQL', 'PM2 restart → health check'], evidence: 'README.md · api/scripts/ · /home/divergram/*' },
      { id: 'eas', status: '구현', name: 'Expo · EAS', summary: 'iOS와 Android 네이티브 빌드', detail: 'Expo 설정과 EAS 프로필로 개발, 테스트와 스토어 제출용 앱을 빌드합니다.', links: ['app source → EAS Build', 'iOS credentials', 'Android credentials'], evidence: 'app/app.json · app/eas.json · app/package.json' },
      { id: 'stores', status: '외부 플랫폼', name: 'App Store · Google Play', summary: '테스트 트랙과 공개 출시', detail: 'iOS는 TestFlight/App Store Connect, Android는 비공개 테스트/Play Console을 통해 검증하고 공개합니다.', links: ['EAS/빌드 → Store upload', '테스트 → 심사', '승인 → 공개 배포'], evidence: 'app/eas.json · ios/ · android/' },
    ],
  },
];

const ALL_NODES = LAYERS.flatMap((layer) => layer.nodes);

function FlowNode({ id, eyebrow, title, selectedId, onSelect, tone = 'default' }) {
  return (
    <button type="button" className={`architecture-flow-node is-${tone} ${selectedId === id ? 'is-active' : ''}`} onClick={() => onSelect(id)}>
      <span>{eyebrow}</span><strong>{title}</strong>
    </button>
  );
}

export default function SystemArchitectureSection() {
  const [selectedId, setSelectedId] = useState('idc');
  const selected = ALL_NODES.find((node) => node.id === selectedId) || ALL_NODES[0];

  return (
    <div className="admin-section architecture-section">
      <section className="architecture-hero">
        <div>
          <p className="section-kicker">SYSTEM BLUEPRINT · SOURCE VERIFIED</p>
          <h2>Divergram 시스템 아키텍처</h2>
          <p>현재 소스 코드와 실서버 점검 결과를 기준으로 서비스 구성과 외부 연결을 설명합니다.</p>
        </div>
        <div className="architecture-hero-facts">
          <span>KIDC 물리 서버</span><span>Apache + PM2</span><span>PostgreSQL</span><span>Expo / React Native</span>
        </div>
      </section>

      <section className="architecture-diagram-card" aria-label="Divergram 시스템 흐름도" data-flow-version="2026-09-04">
        <header>
          <div><p className="section-kicker">LIVE SYSTEM FLOW</p><h3>서비스 요청과 데이터 흐름</h3></div>
          <div className="architecture-legend"><span><i className="is-owned" />자체 운영</span><span><i className="is-external" />외부 서비스</span><span><i className="is-partial" />부분·선택 연동</span></div>
        </header>
        <div className="architecture-flowchart">
          <div className="architecture-flow-row is-clients">
            <FlowNode id="app" eyebrow="CLIENT" title="iOS · Android 앱" selectedId={selectedId} onSelect={setSelectedId} tone="client" />
            <FlowNode id="admin" eyebrow="OPERATIONS" title="관리자 웹" selectedId={selectedId} onSelect={setSelectedId} tone="client" />
            <FlowNode id="web" eyebrow="PUBLIC" title="Divergram 웹" selectedId={selectedId} onSelect={setSelectedId} tone="client" />
          </div>
          <div className="architecture-flow-arrow"><span>HTTPS 요청</span><i>↓</i></div>
          <div className="architecture-flow-row is-edge">
            <FlowNode id="idc" eyebrow="LG DACOM KIDC" title="IBM 물리 서버" selectedId={selectedId} onSelect={setSelectedId} tone="owned" />
            <b className="architecture-inline-arrow">→</b>
            <FlowNode id="apache" eyebrow="PORT 80 · 443" title="Apache HTTPS" selectedId={selectedId} onSelect={setSelectedId} tone="owned" />
            <b className="architecture-inline-arrow">→</b>
            <FlowNode id="pm2" eyebrow="PROCESS" title="PM2 · Node.js" selectedId={selectedId} onSelect={setSelectedId} tone="owned" />
          </div>
          <div className="architecture-flow-arrow"><span>127.0.0.1:43100</span><i>↓</i></div>
          <div className="architecture-flow-row is-core">
            <FlowNode id="security" eyebrow="AUTH · ENCRYPTION" title="인증·개인정보" selectedId={selectedId} onSelect={setSelectedId} tone="core" />
            <FlowNode id="api" eyebrow="APPLICATION CORE" title="Express API" selectedId={selectedId} onSelect={setSelectedId} tone="core" />
            <FlowNode id="worker" eyebrow="ASYNC" title="Queue Worker" selectedId={selectedId} onSelect={setSelectedId} tone="core" />
          </div>
          <div className="architecture-flow-split"><i /><span>업무 데이터 · 미디어 · 외부 API 분기</span><i /></div>
          <div className="architecture-flow-branches">
            <div className="architecture-branch is-data"><h4>DATA & STORAGE</h4><FlowNode id="postgres" eyebrow="TCP 5432" title="PostgreSQL" selectedId={selectedId} onSelect={setSelectedId} tone="owned" /><FlowNode id="media" eyebrow="SERVER FILE" title="자체 미디어 저장소" selectedId={selectedId} onSelect={setSelectedId} tone="owned" /><FlowNode id="cloudinary" eyebrow="OPTIONAL" title="Cloudinary" selectedId={selectedId} onSelect={setSelectedId} tone="partial" /></div>
            <div className="architecture-branch is-services"><h4>EXTERNAL SERVICES</h4><div><FlowNode id="push" eyebrow="PUSH" title="FCM · APNs" selectedId={selectedId} onSelect={setSelectedId} tone="external" /><FlowNode id="infobip" eyebrow="VERIFY" title="Infobip" selectedId={selectedId} onSelect={setSelectedId} tone="external" /><FlowNode id="meta" eyebrow="SOCIAL" title="Meta" selectedId={selectedId} onSelect={setSelectedId} tone="partial" /><FlowNode id="wallet" eyebrow="PASS" title="Wallet" selectedId={selectedId} onSelect={setSelectedId} tone="partial" /><FlowNode id="admob" eyebrow="ADS" title="AdMob" selectedId={selectedId} onSelect={setSelectedId} tone="external" /><FlowNode id="ai" eyebrow="AI" title="OpenAI" selectedId={selectedId} onSelect={setSelectedId} tone="external" /></div></div>
          </div>
          <div className="architecture-flow-return"><i>↺</i><span>응답 · 푸시 · 인증 결과 · 미디어 URL이 앱과 관리자 화면으로 돌아갑니다.</span></div>
        </div>
      </section>

      <section className="architecture-layout">
        <div className="architecture-map">
          {LAYERS.map((layer) => (
            <article className="architecture-layer" key={layer.number}>
              <header><b>{layer.number}</b><div><h3>{layer.title}</h3><p>{layer.description}</p></div></header>
              <div className="architecture-node-grid">
                {layer.nodes.map((node) => (
                  <button type="button" className={`architecture-node ${selected.id === node.id ? 'is-active' : ''}`} key={node.id} onClick={() => setSelectedId(node.id)}>
                    <span>{node.status}</span><strong>{node.name}</strong><small>{node.summary}</small>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside className="architecture-detail">
          <span>{selected.status}</span>
          <h3>{selected.name}</h3>
          <p>{selected.detail}</p>
          <h4>주요 연결</h4>
          <ul>{selected.links.map((link) => <li key={link}>{link}</li>)}</ul>
          <h4>확인 근거</h4>
          <code>{selected.evidence}</code>
        </aside>
      </section>

      <section className="architecture-flow-grid">
        <article><span>01</span><strong>일반 요청</strong><p>앱·관리자 → Apache HTTPS → Express API → PostgreSQL</p></article>
        <article><span>02</span><strong>미디어</strong><p>앱 → Media API → IDC 파일 저장소 → HTTPS 공개</p></article>
        <article><span>03</span><strong>푸시·인증</strong><p>API → Firebase/Infobip → 사용자 기기 → 앱 내 상태 동기화</p></article>
        <article><span>04</span><strong>예약·체크인</strong><p>리조트 예약 → 관리자 처리 → 알림 → Wallet QR 체크인</p></article>
      </section>

      <p className="architecture-footnote">운영 점검 기준: 2026-09-03. 비밀키와 토큰 값은 화면에 포함하지 않았습니다. 외부 플랫폼의 승인 상태와 요금은 각 콘솔에서 별도로 확인해야 합니다.</p>
    </div>
  );
}
