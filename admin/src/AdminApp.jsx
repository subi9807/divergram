import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_ADMIN_API_BASE || 'http://127.0.0.1:4000';

export function AdminApp() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('dg_admin_key') || '');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!adminKey) {
      setError('ADMIN API KEY를 입력해줘.');
      return;
    }

    setLoading(true);
    setError('');
    localStorage.setItem('dg_admin_key', adminKey);

    try {
      const r = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'x-admin-key': adminKey },
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'load failed');
      setStats(j.stats);
      setUsers(j.latestUsers || []);
    } catch (e) {
      setError(e.message || '요청 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) load();
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Divergram Admin</h1>
        <p>onub2b 스타일 참고용 기본 레이아웃</p>
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
            <button onClick={load} disabled={loading}>{loading ? '로딩...' : '조회'}</button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="grid">
          <div className="card stat">
            <h3>총 사용자</h3>
            <strong>{stats?.users ?? '-'}</strong>
          </div>
          <div className="card stat">
            <h3>API 업타임(초)</h3>
            <strong>{stats?.uptimeSec ?? '-'}</strong>
          </div>
        </div>

        <div className="card">
          <h2>최근 가입 사용자</h2>
          <table>
            <thead><tr><th>ID</th><th>Email</th><th>Username</th><th>Created</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.username}</td>
                  <td>{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
