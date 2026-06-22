import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

function badgeClass(status = '') {
  const value = String(status).toLowerCase();
  if (['connected', 'verified', 'resolved', 'ready'].includes(value)) return 'badge active';
  if (['pending', 'reviewing', 'received', 'open'].includes(value)) return 'badge';
  if (['blocked', 'rejected'].includes(value)) return 'badge blocked';
  return 'badge';
}

export default function DashboardSection({ stats, trendData, memberTypeData, blockData, roleCounts, reportBreakdown, reports = [], certifications = [], mapPoints = [], adSlots = [] }) {
  return (
    <>
      <div className="monitor-strip card">
        <div className="monitor-item"><span>CPU</span><strong>{stats?.system?.cpuUsagePct ?? '-'}%</strong></div>
        <div className="monitor-item"><span>MEM</span><strong>{stats?.system?.memoryUsagePct ?? '-'}%</strong></div>
        <div className="monitor-item"><span>DISK</span><strong>{stats?.system?.disk?.usedPct ?? '-'}%</strong></div>
        <div className="monitor-item"><span>NET IN</span><strong>{stats?.system?.network?.inMb ?? '-'}MB</strong></div>
        <div className="monitor-item"><span>NET OUT</span><strong>{stats?.system?.network?.outMb ?? '-'}MB</strong></div>
        <div className="monitor-item"><span>FEED</span><strong>{stats?.feedCount ?? '-'}</strong></div>
        <div className="monitor-item"><span>REELS</span><strong>{stats?.reelsCount ?? '-'}</strong></div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>회원 분류</h2>
          <div className="mini-stat-row">
            <div className="mini-stat"><span>전체</span><strong>{roleCounts?.all ?? 0}</strong></div>
            <div className="mini-stat"><span>일반</span><strong>{roleCounts?.general ?? 0}</strong></div>
            <div className="mini-stat"><span>리조트</span><strong>{roleCounts?.resort ?? 0}</strong></div>
            <div className="mini-stat"><span>관리자</span><strong>{roleCounts?.admin ?? 0}</strong></div>
          </div>
        </div>
        <div className="card">
          <h2>신고 상태</h2>
          <div className="mini-stat-row">
            <div className="mini-stat"><span>접수</span><strong>{reportBreakdown?.received ?? 0}</strong></div>
            <div className="mini-stat"><span>검토</span><strong>{reportBreakdown?.reviewing ?? 0}</strong></div>
            <div className="mini-stat"><span>처리</span><strong>{reportBreakdown?.resolved ?? 0}</strong></div>
            <div className="mini-stat"><span>반려</span><strong>{reportBreakdown?.rejected ?? 0}</strong></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ height: 340 }}>
        <h2>최근 14일 유입/활동 추이</h2>
        <ResponsiveContainer width="100%" height="88%">
          <LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Legend />
            <Line type="monotone" dataKey="signups" name="가입자" stroke="#2563eb" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="posts" name="게시물" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="interactions" name="인터랙션" stroke="#ea580c" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="dau" name="DAU" stroke="#7c3aed" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid">
        <div className="card" style={{ height: 300 }}>
          <h2>회원 구분 비중</h2>
          <ResponsiveContainer width="100%" height="85%"><PieChart><Pie data={memberTypeData} dataKey="value" nameKey="name" outerRadius={88} innerRadius={52}><Cell fill="#3b82f6" /><Cell fill="#0ea5e9" /></Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
        </div>
        <div className="card" style={{ height: 300 }}>
          <h2>계정 상태 비중</h2>
          <ResponsiveContainer width="100%" height="85%"><BarChart data={blockData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>최근 신고</h2>
          <div className="stack-list">
            {(reports || []).slice(0, 5).map((item) => (
              <div key={item.id} className="stack-row">
                <div>
                  <strong>{item.reason || '사유 없음'}</strong>
                  <p>{item.user_id || '-'} · {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</p>
                </div>
                <span className={badgeClass(item.status)}>{item.status || 'open'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>광고 슬롯</h2>
          <div className="stack-list">
            {(adSlots || []).slice(0, 5).map((item) => (
              <div key={item.id} className="stack-row">
                <div>
                  <strong>{item.title || item.id}</strong>
                  <p>{item.placement || '-'}</p>
                </div>
                <span className={badgeClass(item.status)}>{item.status || 'draft'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>자격증 검토</h2>
          <div className="stack-list">
            {(certifications || []).slice(0, 5).map((item) => (
              <div key={item.id} className="stack-row">
                <div>
                  <strong>{item.agency || '기관명 없음'}</strong>
                  <p>{item.certification_number || '번호 없음'} · {item.level || '레벨 없음'}</p>
                </div>
                <span className={badgeClass(item.status)}>{item.status || 'reviewing'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>지도 포인트 요약</h2>
          <div className="mini-stat-row">
            <div className="mini-stat"><span>총 포인트</span><strong>{mapPoints?.length || 0}</strong></div>
            <div className="mini-stat"><span>마커 운영</span><strong>포인트/리조트</strong></div>
            <div className="mini-stat"><span>광고 슬롯</span><strong>{adSlots?.length || 0}</strong></div>
            <div className="mini-stat"><span>운영 모드</span><strong>실서버</strong></div>
          </div>
        </div>
      </div>
    </>
  );
}
