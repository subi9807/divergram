import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'http://127.0.0.1:4000';
const DEFAULT_ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

async function api(path, { adminKey, method = 'GET', body } = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': adminKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'request_failed');
  return j;
}

export function AdminApp() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('dg_admin_key') || DEFAULT_ADMIN_KEY || '');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('dashboard');

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('app_users');
  const [tableRows, setTableRows] = useState([]);
  const [authCheck, setAuthCheck] = useState(null);
  const [growth, setGrowth] = useState(null);

  const refresh = async () => {
    if (!adminKey) {
      setError('ADMIN API KEY를 입력해줘.');
      return;
    }
    setLoading(true);
    setError('');
    localStorage.setItem('dg_admin_key', adminKey);
    try {
      const [s, u, l, t, g] = await Promise.all([
        api('/api/admin/stats', { adminKey }),
        api(`/api/admin/users?q=${encodeURIComponent(query)}&limit=50`, { adminKey }),
        api('/api/admin/audit-logs?limit=20', { adminKey }),
        api('/api/admin/tables', { adminKey }),
        api('/api/admin/growth?days=14', { adminKey }),
      ]);
      setStats(s.stats);
      setUsers(u.users || []);
      setLogs(l.logs || []);
      setTables(t.tables || []);
      setGrowth(g);
    } catch (e) {
      setError(e.message || '요청 실패');
    } finally {
      setLoading(false);
    }
  };

  const refreshTableRows = async (name = selectedTable) => {
    try {
      const r = await api(`/api/admin/table/${name}?limit=100`, { adminKey });
      setTableRows(r.rows || []);
    } catch (e) {
      setError(e.message || '테이블 조회 실패');
    }
  };

  const updateUser = async (id, payload) => {
    try {
      await api(`/api/admin/users/${id}`, { adminKey, method: 'PATCH', body: payload });
      await refresh();
    } catch (e) {
      setError(e.message || '수정 실패');
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('정말 이 사용자를 삭제할까?')) return;
    try {
      await api(`/api/admin/users/${id}`, { adminKey, method: 'DELETE' });
      await refresh();
    } catch (e) {
      setError(e.message || '삭제 실패');
    }
  };

  const seedBulk = async () => {
    try {
      setLoading(true);
      await api('/api/admin/seed-bulk', {
        adminKey,
        method: 'POST',
        body: { users: 50, posts: 300, comments: 1000, likes: 2000 },
      });
      await api('/api/admin/migrate-normalized', { adminKey, method: 'POST' });
      await refresh();
      if (section === 'tables') await refreshTableRows();
    } catch (e) {
      setError(e.message || '샘플 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const checkUserAdminAuth = async () => {
    try {
      const [adminRes, userRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@divergram.local', password: 'Password123!' }),
        }),
        fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'sample1@divergram.local', password: 'Password123!' }),
        }),
      ]);
      setAuthCheck({ adminOk: adminRes.ok, userOk: userRes.ok });
    } catch {
      setAuthCheck({ adminOk: false, userOk: false });
    }
  };

  useEffect(() => {
    if (adminKey) refresh();
  }, []);

  const trendData = useMemo(() => {
    const mapify = (arr) => Object.fromEntries((arr || []).map((x) => [x.day, Number(x.count || 0)]));
    const s = mapify(growth?.series?.signups);
    const p = mapify(growth?.series?.posts);
    const i = mapify(growth?.series?.interactions);
    const d = mapify(growth?.series?.dauApprox);
    const days = Array.from(new Set([...Object.keys(s), ...Object.keys(p), ...Object.keys(i), ...Object.keys(d)])).sort();
    return days.map((day) => ({ day: day.slice(5), signups: s[day] || 0, posts: p[day] || 0, interactions: i[day] || 0, dau: d[day] || 0 }));
  }, [growth]);

  const memberTypeData = useMemo(() => {
    const personalUsers = Number(stats?.personalUsers || 0);
    const resortUsers = Number(stats?.resortUsers || 0);
    return [{ name: '일반회원', value: personalUsers }, { name: '리조트회원', value: resortUsers }];
  }, [stats]);

  const blockData = useMemo(() => {
    const blocked = Number(stats?.blockedUsers || 0);
    const users = Number(stats?.users || 0);
    return [{ name: '정상', value: Math.max(0, users - blocked) }, { name: '차단', value: blocked }];
  }, [stats]);

  const Icon = ({ kind }) => {
    const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
    if (kind === 'dashboard') return <svg {...common}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>;
    if (kind === 'users') return <svg {...common}><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3"/><path d="M22 19v-1a4 4 0 0 0-3-3.87"/><path d="M16 3.13a3 3 0 0 1 0 5.74"/></svg>;
    if (kind === 'tables') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 4v16"/></svg>;
    if (kind === 'logs') return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16l4-3 4 3 4-3 4 3V8z"/><path d="M14 2v6h6"/></svg>;
    return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V22a2 2 0 1 1-4 0v-.08a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H2a2 2 0 1 1 0-4h.08a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V2a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H22a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.55 1z"/></svg>;
  };

  const menus = [
    { key: 'dashboard', label: '대시보드' },
    { key: 'users', label: '사용자 관리' },
    { key: 'tables', label: '테이블 조회' },
    { key: 'logs', label: '감사 로그' },
    { key: 'settings', label: '설정' },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand" title="Divergram Admin">DG</div>

        <nav className="side-menu">
          {menus.map((m) => (
            <button
              key={m.key}
              className={section === m.key ? 'active' : ''}
              onClick={() => setSection(m.key)}
              title={m.label}
              aria-label={m.label}
            >
              <span className="menu-icon" aria-hidden><Icon kind={m.key} /></span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <div className="topbar">
          <div className="status-pill">
            <span className={`dot ${stats ? 'ok' : 'bad'}`} />
            {stats ? 'API 연결됨' : 'API 미연결'}
          </div>
          <button onClick={refresh} disabled={loading}>{loading ? '동기화 중...' : '동기화'}</button>
        </div>

        {error && <p className="error">{error}</p>}

        {section === 'dashboard' && (
          <>
            <div className="grid">
              <div className="card stat"><h3>총 사용자</h3><strong>{stats?.users ?? '-'}</strong></div>
              <div className="card stat"><h3>일반회원</h3><strong>{stats?.personalUsers ?? '-'}</strong></div>
              <div className="card stat"><h3>리조트회원</h3><strong>{stats?.resortUsers ?? '-'}</strong></div>
              <div className="card stat"><h3>차단 사용자</h3><strong>{stats?.blockedUsers ?? '-'}</strong></div>
            </div>

            <div className="grid">
              <div className="card stat"><h3>CPU 사용률</h3><strong>{stats?.system?.cpuUsagePct ?? '-'}%</strong></div>
              <div className="card stat"><h3>메모리 사용률</h3><strong>{stats?.system?.memoryUsagePct ?? '-'}%</strong></div>
              <div className="card stat"><h3>디스크 사용률</h3><strong>{stats?.system?.disk?.usedPct ?? '-'}%</strong></div>
              <div className="card stat"><h3>네트워크 I/O(MB)</h3><strong>{stats?.system ? `${stats.system.network?.inMb ?? 0} / ${stats.system.network?.outMb ?? 0}` : '-'}</strong></div>
            </div>

            <div className="card" style={{ height: 340 }}>
              <h2>최근 14일 유입/활동 추이</h2>
              <ResponsiveContainer width="100%" height="88%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
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
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart>
                    <Pie data={memberTypeData} dataKey="value" nameKey="name" outerRadius={88} innerRadius={52}>
                      <Cell fill="#3b82f6" />
                      <Cell fill="#0ea5e9" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ height: 300 }}>
                <h2>계정 상태 비중</h2>
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={blockData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {section === 'users' && (
          <div className="card">
            <h2>사용자 관리</h2>
            <div className="row" style={{ marginBottom: 12 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="email/username 검색" />
              <button onClick={refresh}>검색</button>
            </div>
            <table>
              <thead><tr><th>ID</th><th>Email</th><th>Username</th><th>Role</th><th>Blocked</th><th>Action</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td><td>{u.email}</td><td>{u.username}</td><td>{u.role}</td><td>{u.is_blocked ? 'Y' : 'N'}</td>
                    <td className="actions">
                      <button className="sm" onClick={() => updateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}>{u.role === 'admin' ? '관리자해제' : '관리자지정'}</button>
                      <button className="sm" onClick={() => updateUser(u.id, { is_blocked: !u.is_blocked })}>{u.is_blocked ? '차단해제' : '차단'}</button>
                      <button className="sm danger" onClick={() => deleteUser(u.id)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {section === 'tables' && (
          <div className="card">
            <h2>테이블 조회</h2>
            <div className="row" style={{ marginBottom: 12 }}>
              <select value={selectedTable} onChange={(e) => setSelectedTable(e.target.value)}>
                {tables.map((t) => <option key={t.table} value={t.table}>{t.table} ({t.count})</option>)}
              </select>
              <button onClick={() => refreshTableRows(selectedTable)}>조회</button>
            </div>
            <table>
              <thead><tr><th>table</th><th>count</th></tr></thead>
              <tbody>{tables.map((t) => <tr key={t.table}><td>{t.table}</td><td>{t.count}</td></tr>)}</tbody>
            </table>
            <h3 style={{ marginTop: 16 }}>선택 테이블 샘플(최대 100건)</h3>
            <pre style={{ maxHeight: 340, overflow: 'auto', background: '#0b1220', color: '#dbeafe', padding: 12, borderRadius: 8 }}>
{JSON.stringify(tableRows, null, 2)}
            </pre>
          </div>
        )}

        {section === 'logs' && (
          <div className="card">
            <h2>감사 로그</h2>
            <table>
              <thead><tr><th>시간</th><th>Action</th><th>Target User</th><th>Detail</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
                    <td>{l.action}</td>
                    <td>{l.target_user_id || '-'}</td>
                    <td><code>{JSON.stringify(l.detail)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {section === 'settings' && (
          <div className="card">
            <h2>설정/점검</h2>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                refresh();
              }}
              style={{ marginBottom: 12 }}
            >
              <input type="text" autoComplete="username" value="admin" readOnly style={{ display: 'none' }} />
              <input
                type="password"
                autoComplete="current-password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="ADMIN_API_KEY"
              />
              <button type="submit" disabled={loading}>{loading ? '로딩...' : '연결 저장'}</button>
              <button type="button" onClick={seedBulk} disabled={loading}>대량 샘플 생성</button>
            </form>

            <p>사용자/관리자 로그인 체크를 실행할 수 있어.</p>
            <div className="row">
              <button onClick={checkUserAdminAuth}>사용자+관리자 로그인 체크</button>
            </div>
            {authCheck && (
              <p style={{ marginTop: 8 }}>
                관리자 로그인: <strong>{authCheck.adminOk ? '정상' : '실패'}</strong> / 일반 사용자 로그인: <strong>{authCheck.userOk ? '정상' : '실패'}</strong>
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
