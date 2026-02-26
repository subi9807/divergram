import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

interface Stats {
  users: number;
  blockedUsers: number;
  adminUsers: number;
  uptimeSec: number;
}

export default function AdminConsole() {
  const [adminKey, setAdminKey] = useState(localStorage.getItem('dg_admin_key') || '');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!adminKey.trim()) {
      setError('관리자 키를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      localStorage.setItem('dg_admin_key', adminKey.trim());

      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers: { 'x-admin-key': adminKey.trim() } }),
        fetch(`${API_BASE}/api/admin/users?limit=20`, { headers: { 'x-admin-key': adminKey.trim() } }),
      ]);

      const statsJson = await statsRes.json();
      const usersJson = await usersRes.json();

      if (!statsRes.ok) throw new Error(statsJson.error || 'admin_stats_failed');
      if (!usersRes.ok) throw new Error(usersJson.error || 'admin_users_failed');

      setStats(statsJson.stats);
      setUsers(usersJson.users || []);
    } catch (e: any) {
      setError(e.message || '관리자 데이터를 불러오지 못했습니다.');
      setStats(null);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">관리자 콘솔</h1>

      <div className="rounded-lg border p-4 bg-white dark:bg-[#121212] mb-4">
        <label className="block text-sm font-semibold mb-2">Admin API Key</label>
        <div className="flex gap-2">
          <input
            type="password"
            className="flex-1 border rounded-md p-3 dark:bg-[#262626]"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="x-admin-key 입력"
          />
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-blue-500 text-white disabled:opacity-50"
          >
            {loading ? '불러오는 중...' : '불러오기'}
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card label="전체 유저" value={stats.users} />
            <Card label="차단 유저" value={stats.blockedUsers} />
            <Card label="관리자" value={stats.adminUsers} />
            <Card label="Uptime(s)" value={stats.uptimeSec} />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#262626]">
                <tr>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Username</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">{u.id}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.username}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">{u.is_blocked ? 'Y' : 'N'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4 bg-white dark:bg-[#121212]">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
