import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

export default function DashboardSection({ stats, trendData, memberTypeData, blockData }) {
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
    </>
  );
}
