import { useEffect, useState } from 'react';
import { db } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

export default function PersonalInfoEdit() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || '');
    (async () => {
      const { data } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) {
        setUsername(data.username || '');
        setFullName(data.full_name || '');
        setBio(data.bio || '');
      }
    })();
  }, [user]);

  const onSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('dg_token') || '';
      const payload: any = { email, username };
      if (password.trim()) payload.password = password.trim();

      const r = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'save_failed');

      await db.from('profiles').update({ username, full_name: fullName, bio }).eq('id', user.id);
      alert('개인정보가 수정되었습니다.');
      setPassword('');
    } catch (e: any) {
      alert(e.message || '수정 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">개인정보 수정</h1>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <input autoComplete="email" className="w-full border rounded-md p-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" />
        <input autoComplete="username" className="w-full border rounded-md p-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="사용자명" />
        <input autoComplete="name" className="w-full border rounded-md p-3" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="이름" />
        <textarea className="w-full border rounded-md p-3 min-h-24" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="자기소개" />
        <input type="password" autoComplete="new-password" className="w-full border rounded-md p-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="새 비밀번호(선택)" />
        <button type="submit" className="px-4 py-2 rounded-md bg-blue-500 text-white disabled:opacity-50" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
}
