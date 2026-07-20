import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

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

export default function DashboardSection({ stats, trendData, memberTypeData, blockData, roleCounts, reportBreakdown, reports = [], certifications = [], mapPoints = [], adSlots = [] }) {
  const system = stats?.system || {};

  const overview = [
    { label: '총 회원', value: formatCount(stats?.users), hint: `일반 ${formatCount(roleCounts?.general)} · 리조트 ${formatCount(roleCounts?.resort)}`, tone: 'blue' },
    { label: '신고', value: formatCount(stats?.reports), hint: `접수 ${formatCount(reportBreakdown?.received)} · 처리 ${formatCount(reportBreakdown?.resolved)}`, tone: 'red' },
    { label: '콘텐츠', value: formatCount(stats?.feedCount), hint: `피드 ${formatCount(stats?.feedCount)} · 릴스 ${formatCount(stats?.reelsCount)}`, tone: 'green' },
    { label: '운영 상태', value: '실서버', hint: `CPU ${formatPercent(system.cpuUsagePct)} · MEM ${formatPercent(system.memoryUsagePct)}`, tone: 'slate' },
  ];

  return (
    <div className="dashboard-shell">
      <section className="card dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-kicker">운영 현황</p>
          <h1>Divergram Admin</h1>
          <p>회원, 신고, 리조트, 콘텐츠, 광고 상태를 한 화면에서 빠르게 확인할 수 있게 정리했어.</p>
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
