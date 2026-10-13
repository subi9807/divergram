import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

import { useState } from 'react';

function badgeClass(status = '') {
  const value = String(status).toLowerCase();
  if (['connected', 'verified', 'resolved', 'ready'].includes(value)) return 'badge active';
  if (['pending', 'reviewing', 'received', 'open', 'draft'].includes(value)) return 'badge';
  if (['blocked', 'rejected'].includes(value)) return 'badge blocked';
  return 'badge';
}

function formatCount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '0';
}

function formatPercent(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '-';
  return `${n}%`;
}

function MetricCard({ label, value, hint, tone = 'slate' }) {
  return (
    <div className={`dashboard-metric dashboard-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

const integrationCategoryLabels = {
  core: '핵심 인프라', messaging: '메시징', ai: 'AI', media: '미디어', data: '데이터',
  auth: '로그인', payments: '결제', observability: '모니터링',
};

function integrationStatusLabel(status) {
  if (status === 'operational') return '정상';
  if (status === 'configured') return '설정됨';
  if (status === 'degraded') return '점검 필요';
  return '미설정';
}

export default function DashboardSection({ stats, trendData, memberTypeData, blockData, roleCounts, reportBreakdown, reports = [], certifications = [], mapPoints = [], adSlots = [], externalIntegrations, externalIntegrationsLoading, onRefreshExternalIntegrations, onNavigate }) {
  const system = stats?.system || {};
  const [integrationFilter, setIntegrationFilter] = useState('attention');
  const integrations = externalIntegrations?.integrations || [];
  const visibleIntegrations = integrations.filter((item) => integrationFilter === 'all' || (integrationFilter === 'attention' ? ['degraded', 'not_configured'].includes(item.status) : item.status === integrationFilter));

  const overview = [
    { label: '총 회원', value: formatCount(stats?.users), hint: `일반 ${formatCount(roleCounts?.general)} · 리조트 ${formatCount(roleCounts?.resort)}`, tone: 'blue' },
    { label: '신고', value: formatCount(stats?.reports), hint: `접수 ${formatCount(reportBreakdown?.received)} · 처리 ${formatCount(reportBreakdown?.resolved)}`, tone: 'red' },
    { label: '콘텐츠', value: stats ? formatCount(Number(stats.feedCount || 0) + Number(stats.reelsCount || 0)) : '—', hint: `피드 ${formatCount(stats?.feedCount)} · 릴스 ${formatCount(stats?.reelsCount)}`, tone: 'green' },
    { label: '외부 연동 점검', value: externalIntegrations ? formatCount(externalIntegrations.counts?.degraded) : '—', hint: '인증·연결 오류가 확인된 서비스', tone: 'slate' },
  ];
  const pendingCertifications = certifications.filter((item) => ['pending', 'reviewing', 'unregistered'].includes(String(item?.status || '').toLowerCase())).length;
  const pendingReports = Number(reportBreakdown?.received || 0) + Number(reportBreakdown?.reviewing || 0) + Number(reportBreakdown?.open || 0);
  const operationQueue = [
    { key: 'reports', eyebrow: 'TRUST & SAFETY', title: '처리 대기 신고', value: pendingReports, copy: '접수 또는 검토 단계의 신고를 확인합니다.', tone: 'critical' },
    { key: 'certifications', eyebrow: 'MEMBER TRUST', title: '라이선스 심사', value: pendingCertifications, copy: '증빙을 확인하고 승인 또는 반려합니다.', tone: 'review' },
    { key: 'ads', eyebrow: 'REVENUE', title: '활성 광고 슬롯', value: adSlots.filter((item) => item.is_active).length, copy: '현재 노출 중인 광고 상태를 점검합니다.', tone: 'revenue' },
    { key: 'users', eyebrow: 'COMMUNITY', title: '전체 회원', value: Number(stats?.users || 0), copy: '계정 상태와 가입 흐름을 관리합니다.', tone: 'member' },
  ];

  return (
    <div className="dashboard-shell">
      <section className="card dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-kicker">DIVERGRAM WORKSPACE</p>
          <h1>오늘의 운영을 한눈에.</h1>
          <p>커뮤니티의 흐름을 살피고, 필요한 일부터 차근차근 처리하세요.</p>
        </div>
        <div className="dashboard-hero-grid">
          {overview.map((item) => (
            <MetricCard key={item.label} {...item} />
          ))}
        </div>
      </section>

      <section className="card dashboard-strip">
        <div className="dashboard-strip-item"><span>CPU</span><strong>{formatPercent(system.cpuUsagePct)}</strong></div>
        <div className="dashboard-strip-item"><span>MEM</span><strong>{formatPercent(system.memoryUsagePct)}</strong></div>
        <div className="dashboard-strip-item"><span>DISK</span><strong>{formatPercent(system.disk?.usedPct)}</strong></div>
        <div className="dashboard-strip-item"><span>NET IN</span><strong>{formatCount(system.network?.inMb)}MB</strong></div>
        <div className="dashboard-strip-item"><span>NET OUT</span><strong>{formatCount(system.network?.outMb)}MB</strong></div>
        <div className="dashboard-strip-item"><span>피드</span><strong>{formatCount(stats?.feedCount)}</strong></div>
        <div className="dashboard-strip-item"><span>릴스</span><strong>{formatCount(stats?.reelsCount)}</strong></div>
      </section>

      <section className="card dashboard-integrations">
        <div className="panel-head dashboard-integrations-head">
          <div>
            <p className="section-kicker">CONNECTED SERVICES</p>
            <h2>외부 API 연동 현황</h2>
            <p>인증키 값은 노출하지 않고 설정, 인증 응답, 최근 운영 상태만 확인합니다.</p>
          </div>
          <div className="dashboard-integrations-actions">
            <span>{externalIntegrations?.checkedAt ? `${new Date(externalIntegrations.checkedAt).toLocaleString('ko-KR')} 확인` : '확인 대기'}</span>
            <button type="button" onClick={onRefreshExternalIntegrations} disabled={externalIntegrationsLoading}>{externalIntegrationsLoading ? '확인 중' : '상태 새로고침'}</button>
          </div>
        </div>
        <div className="dashboard-integrations-summary">
          <span><i className="is-operational" />정상 <strong>{formatCount(externalIntegrations?.counts?.operational)}</strong></span>
          <span><i className="is-configured" />설정됨 <strong>{formatCount(externalIntegrations?.counts?.configured)}</strong></span>
          <span><i className="is-degraded" />점검 필요 <strong>{formatCount(externalIntegrations?.counts?.degraded)}</strong></span>
          <span><i className="is-not-configured" />미설정 <strong>{formatCount(externalIntegrations?.counts?.not_configured)}</strong></span>
        </div>
        <div className="integration-filters" aria-label="연동 상태 필터">
          {[['attention', '점검·설정 필요'], ['all', '전체 서비스'], ['operational', '인증 확인'], ['configured', '설정됨']].map(([key, label]) => <button className="integration-filter" type="button" key={key} aria-pressed={integrationFilter === key} onClick={() => setIntegrationFilter(key)}>{label}</button>)}
        </div>
        <div className="dashboard-integrations-list">
          {visibleIntegrations.map((entry) => (
            <article key={entry.id} className={`integration-card is-${entry.status}`}>
              <div className="integration-card-title">
                <span>{integrationCategoryLabels[entry.category] || entry.category}</span>
                <strong className={`integration-status is-${entry.status}`}><i />{integrationStatusLabel(entry.status)}</strong>
              </div>
              <h3>{entry.name}</h3>
              <p>{entry.detail}</p>
              <footer><span>{entry.checkType === 'live' ? '인증 응답 확인' : '설정만 확인'}</span><button type="button" onClick={() => onNavigate?.(['api', 'database'].includes(entry.id) ? 'operations' : 'api-management', { service: entry.id.replace(/^infobip-.*/, 'infobip') })}>설정 열기 ↗</button></footer>
            </article>
          ))}
          {!externalIntegrations?.integrations?.length ? <div className="integration-empty">외부 API 상태를 불러오는 중입니다.</div> : null}
          {integrations.length > 0 && visibleIntegrations.length === 0 ? <div className="integration-empty">이 상태에 해당하는 서비스가 없습니다.</div> : null}
        </div>
      </section>

      <section className="dashboard-queue">
        <div className="dashboard-section-title"><div><p className="section-kicker">TODAY'S OPERATIONS</p><h2>지금 처리할 업무</h2></div><span>업무 카드를 선택하면 해당 관리 화면으로 이동합니다.</span></div>
        <div className="dashboard-queue-grid">{operationQueue.map((item) => <button type="button" key={item.key} className={`dashboard-queue-card is-${item.tone}`} onClick={() => onNavigate?.(item.key)}><span>{item.eyebrow}</span><strong>{item.value.toLocaleString('ko-KR')}</strong><h3>{item.title}</h3><p>{item.copy}</p><i aria-hidden>→</i></button>)}</div>
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <div className="card dashboard-panel dashboard-panel--wide">
          <div className="panel-head">
            <div>
              <h2>최근 14일 유입/활동 추이</h2>
              <p>가입, 게시물, 인터랙션, DAU 흐름을 같이 보여줘.</p>
            </div>
          </div>
          <div className="dashboard-chart dashboard-chart--line">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="signups" name="가입자" stroke="#2563eb" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="posts" name="게시물" stroke="#16a34a" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="interactions" name="인터랙션" stroke="#ea580c" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="dau" name="DAU" stroke="#7c3aed" strokeWidth={2.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>회원 분류</h2>
              <p>전체 사용자 구조를 빠르게 파악할 수 있어.</p>
            </div>
          </div>
          <div className="mini-stat-row">
            <div className="mini-stat"><span>전체</span><strong>{formatCount(roleCounts?.all)}</strong></div>
            <div className="mini-stat"><span>일반</span><strong>{formatCount(roleCounts?.general)}</strong></div>
            <div className="mini-stat"><span>리조트</span><strong>{formatCount(roleCounts?.resort)}</strong></div>
            <div className="mini-stat"><span>관리자</span><strong>{formatCount(roleCounts?.admin)}</strong></div>
          </div>
          <div className="dashboard-chart dashboard-chart--small">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={memberTypeData} dataKey="value" nameKey="name" outerRadius={72} innerRadius={46} paddingAngle={3}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#0ea5e9" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>신고 상태</h2>
              <p>처리 흐름을 한눈에 확인할 수 있게 정리했어.</p>
            </div>
          </div>
          <div className="mini-stat-row">
            <div className="mini-stat"><span>접수</span><strong>{formatCount(reportBreakdown?.received)}</strong></div>
            <div className="mini-stat"><span>검토</span><strong>{formatCount(reportBreakdown?.reviewing)}</strong></div>
            <div className="mini-stat"><span>처리</span><strong>{formatCount(reportBreakdown?.resolved)}</strong></div>
            <div className="mini-stat"><span>반려</span><strong>{formatCount(reportBreakdown?.rejected)}</strong></div>
          </div>
          <div className="dashboard-chart dashboard-chart--small">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={blockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>최근 신고</h2>
              <p>처리 전에 먼저 봐야 할 항목들만 뽑아놨어.</p>
            </div>
          </div>
          <div className="stack-list">
            {(reports || []).slice(0, 5).map((item) => (
              <div key={item.id} className="stack-row stack-row--dashboard">
                <div>
                  <strong>{item.reason || '사유 없음'}</strong>
                  <p>{item.user_id || '-'} · {item.created_at ? new Date(item.created_at).toLocaleString('ko-KR') : '-'}</p>
                </div>
                <span className={badgeClass(item.status)}>{item.status || 'open'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>광고 슬롯</h2>
              <p>운영 중인 광고 슬롯 상태를 확인할 수 있어.</p>
            </div>
          </div>
          <div className="stack-list">
            {(adSlots || []).slice(0, 5).map((item) => (
              <div key={item.id} className="stack-row stack-row--dashboard">
                <div>
                  <strong>{item.title || item.id}</strong>
                  <p>{item.placement || '-'}</p>
                </div>
                <span className={badgeClass(item.status)}>{item.status || 'draft'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>자격증 검토</h2>
              <p>검토 대기, 인증 완료 상태를 함께 볼 수 있어.</p>
            </div>
          </div>
          <div className="stack-list">
            {(certifications || []).slice(0, 5).map((item) => (
              <div key={item.id} className="stack-row stack-row--dashboard">
                <div>
                  <strong>{item.agency || '기관명 없음'}</strong>
                  <p>{item.certification_number || '번호 없음'} · {item.level || '레벨 없음'}</p>
                </div>
                <span className={badgeClass(item.status)}>{item.status || 'reviewing'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>지도 포인트 요약</h2>
              <p>운영 중인 포인트와 광고 슬롯을 묶어서 보여줘.</p>
            </div>
          </div>
          <div className="mini-stat-row">
            <div className="mini-stat"><span>총 포인트</span><strong>{formatCount(mapPoints?.length)}</strong></div>
            <div className="mini-stat"><span>광고 슬롯</span><strong>{formatCount(adSlots?.length)}</strong></div>
            <div className="mini-stat"><span>운영 모드</span><strong>실서버</strong></div>
            <div className="mini-stat"><span>상태</span><strong className={stats ? 'text-ok' : 'text-warn'}>{stats ? '연결' : '미연결'}</strong></div>
          </div>
        </div>

        <div className="card dashboard-panel">
          <div className="panel-head">
            <div>
              <h2>시스템 상태</h2>
              <p>서버 상태를 가볍게 확인할 수 있어.</p>
            </div>
          </div>
          <div className="dashboard-system-list">
            <div><span>CPU</span><strong>{formatPercent(system.cpuUsagePct)}</strong></div>
            <div><span>MEM</span><strong>{formatPercent(system.memoryUsagePct)}</strong></div>
            <div><span>DISK</span><strong>{formatPercent(system.disk?.usedPct)}</strong></div>
            <div><span>NET</span><strong>{formatCount(system.network?.inMb)} / {formatCount(system.network?.outMb)} MB</strong></div>
          </div>
        </div>
      </section>
    </div>
  );
}
