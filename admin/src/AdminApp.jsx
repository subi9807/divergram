import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'http://127.0.0.1:4000';

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
  const [adminKey, setAdminKey] = useState(localStorage.getItem('dg_admin_key') || '');
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

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Divergram Admin</h1>
        <p>기본 운영 기능(사용자/권한/차단/감사로그)</p>

        <nav className="side-menu">
          <button className={section === 'dashboard' ? 'active' : ''} onClick={() => setSection('dashboard')}>대시보드</button>
          <button className={section === 'users' ? 'active' : ''} onClick={() => setSection('users')}>사용자 관리</button>
          <button className={section === 'tables' ? 'active' : ''} onClick={() => setSection('tables')}>테이블 조회</button>
          <button className={section === 'logs' ? 'active' : ''} onClick={() => setSection('logs')}>감사 로그</button>
          <button className={section === 'settings' ? 'active' : ''} onClick={() => setSection('settings')}>설정</button>
        </nav>
      </aside>

      <main className="content">
        <div className="card">
          <h2>연결 설정</h2>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              refresh();
            }}
          >
            <input type="text" autoComplete="username" value="admin" readOnly style={{ display: 'none' }} />
            <input
              type="password"
              autoComplete="current-password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="ADMIN_API_KEY"
            />
            <button type="submit" disabled={loading}>{loading ? '로딩...' : '새로고침'}</button>
            <button type="button" onClick={seedBulk} disabled={loading}>대량 샘플 생성</button>
          </form>
          {error && <p className="error">{error}</p>}
        </div>

        {section === 'dashboard' && (
          <>
            <div className="grid">
              <div className="card stat"><h3>총 사용자</h3><strong>{stats?.users ?? '-'}</strong></div>
              <div className="card stat"><h3>관리자 수</h3><strong>{stats?.adminUsers ?? '-'}</strong></div>
              <div className="card stat"><h3>차단 사용자</h3><strong>{stats?.blockedUsers ?? '-'}</strong></div>
              <div className="card stat"><h3>API 업타임(초)</h3><strong>{stats?.uptimeSec ?? '-'}</strong></div>
            </div>
            <div className="grid">
              <div className="card stat"><h3>14일 가입자</h3><strong>{growth?.series?.signups?.reduce((a, b) => a + Number(b.count || 0), 0) ?? '-'}</strong></div>
              <div className="card stat"><h3>14일 게시물</h3><strong>{growth?.series?.posts?.reduce((a, b) => a + Number(b.count || 0), 0) ?? '-'}</strong></div>
              <div className="card stat"><h3>14일 인터랙션</h3><strong>{growth?.series?.interactions?.reduce((a, b) => a + Number(b.count || 0), 0) ?? '-'}</strong></div>
              <div className="card stat"><h3>최근 DAU(근사)</h3><strong>{growth?.series?.dauApprox?.at(-1)?.count ?? 0}</strong></div>
            </div>
            <div className="card">
              <h2>최근 14일 유입/활동 추이</h2>
              <table>
                <thead><tr><th>일자</th><th>가입자</th><th>게시물</th><th>인터랙션</th><th>DAU(근사)</th></tr></thead>
                <tbody>
                  {(() => {
                    const days = new Set([
                      ...(growth?.series?.signups || []).map((x) => x.day),
                      ...(growth?.series?.posts || []).map((x) => x.day),
                      ...(growth?.series?.interactions || []).map((x) => x.day),
                      ...(growth?.series?.dauApprox || []).map((x) => x.day),
                    ]);
                    const mapify = (arr) => Object.fromEntries((arr || []).map((x) => [x.day, x.count]));
                    const s = mapify(growth?.series?.signups);
                    const p = mapify(growth?.series?.posts);
                    const i = mapify(growth?.series?.interactions);
                    const d = mapify(growth?.series?.dauApprox);
                    return [...days].sort().map((day) => (
                      <tr key={day}>
                        <td>{day}</td>
                        <td>{s[day] || 0}</td>
                        <td>{p[day] || 0}</td>
                        <td>{i[day] || 0}</td>
                        <td>{d[day] || 0}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
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
