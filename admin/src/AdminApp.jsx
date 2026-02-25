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

  const refresh = async () => {
    if (!adminKey) {
      setError('ADMIN API KEY를 입력해줘.');
      return;
    }
    setLoading(true);
    setError('');
    localStorage.setItem('dg_admin_key', adminKey);
    try {
      const [s, u, l] = await Promise.all([
        api('/api/admin/stats', { adminKey }),
        api(`/api/admin/users?q=${encodeURIComponent(query)}&limit=50`, { adminKey }),
        api('/api/admin/audit-logs?limit=20', { adminKey }),
      ]);
      setStats(s.stats);
      setUsers(u.users || []);
      setLogs(l.logs || []);
    } catch (e) {
      setError(e.message || '요청 실패');
    } finally {
      setLoading(false);
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
          <button className={section === 'logs' ? 'active' : ''} onClick={() => setSection('logs')}>감사 로그</button>
          <button className={section === 'settings' ? 'active' : ''} onClick={() => setSection('settings')}>설정</button>
        </nav>
      </aside>

      <main className="content">
        <div className="card">
          <h2>연결 설정</h2>
          <div className="row">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="ADMIN_API_KEY"
            />
            <button onClick={refresh} disabled={loading}>{loading ? '로딩...' : '새로고침'}</button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>

        {section === 'dashboard' && (
          <div className="grid">
            <div className="card stat"><h3>총 사용자</h3><strong>{stats?.users ?? '-'}</strong></div>
            <div className="card stat"><h3>관리자 수</h3><strong>{stats?.adminUsers ?? '-'}</strong></div>
            <div className="card stat"><h3>차단 사용자</h3><strong>{stats?.blockedUsers ?? '-'}</strong></div>
            <div className="card stat"><h3>API 업타임(초)</h3><strong>{stats?.uptimeSec ?? '-'}</strong></div>
          </div>
        )}

        {section === 'users' && (
          <div className="card">
            <h2>사용자 관리</h2>
            <div className="row" style={{ marginBottom: 12 }}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="email/username 검색"
              />
              <button onClick={refresh}>검색</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Email</th><th>Username</th><th>Role</th><th>Blocked</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.username}</td>
                    <td>{u.role}</td>
                    <td>{u.is_blocked ? 'Y' : 'N'}</td>
                    <td className="actions">
                      <button className="sm" onClick={() => updateUser(u.id, { role: u.role === 'admin' ? 'user' : 'admin' })}>
                        {u.role === 'admin' ? '관리자해제' : '관리자지정'}
                      </button>
                      <button className="sm" onClick={() => updateUser(u.id, { is_blocked: !u.is_blocked })}>
                        {u.is_blocked ? '차단해제' : '차단'}
                      </button>
                      <button className="sm danger" onClick={() => deleteUser(u.id)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <h2>설정</h2>
            <p>기본 설정 메뉴(추후 알림 정책, 권한 정책, 운영 옵션 추가 예정)</p>
          </div>
        )}
      </main>
    </div>
  );
}
