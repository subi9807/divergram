import { useEffect, useMemo, useState } from 'react';
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
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [initial, setInitial] = useState({ email: '', username: '', fullName: '', bio: '' });

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || '');
    (async () => {
      const { data } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) {
        const next = {
          email: user.email || '',
          username: data.username || '',
          fullName: data.full_name || '',
          bio: data.bio || '',
        };
        setUsername(next.username);
        setFullName(next.fullName);
        setBio(next.bio);
        setInitial(next);
      }
    })();
  }, [user]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const usernameValid = /^[a-zA-Z0-9_]{2,32}$/.test(username);
  const passwordValid = password.length === 0 || (password.length >= 8 && password.length <= 128);
  const passwordMatch = password === passwordConfirm;
  const bioCount = bio.length;

  const isDirty = useMemo(() => {
    return (
      email !== initial.email ||
      username !== initial.username ||
      fullName !== initial.fullName ||
      bio !== initial.bio ||
      password.length > 0 ||
      passwordConfirm.length > 0
    );
  }, [email, username, fullName, bio, password, passwordConfirm, initial]);

  const canSave = emailValid && usernameValid && passwordValid && passwordMatch && isDirty && !saving;

  const onSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setMessage('');
    setError('');
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

      setInitial({ email, username, fullName, bio });
      setPassword('');
      setPasswordConfirm('');
      setMessage('개인정보가 수정되었습니다.');
    } catch (e: any) {
      setError(e.message || '수정 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">개인정보 수정</h1>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div>
          <input autoComplete="email" className="w-full border rounded-md p-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" />
          {!emailValid && <p className="text-xs text-red-500 mt-1">유효한 이메일 형식이 아닙니다.</p>}
        </div>

        <div>
          <input autoComplete="username" className="w-full border rounded-md p-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="사용자명 (2~32자, 영문/숫자/_)" />
          {!usernameValid && <p className="text-xs text-red-500 mt-1">사용자명 규칙을 확인해주세요.</p>}
        </div>

        <input autoComplete="name" className="w-full border rounded-md p-3" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="이름" />

        <div>
          <textarea className="w-full border rounded-md p-3 min-h-24" maxLength={150} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="자기소개" />
          <p className="text-xs text-gray-500 mt-1">{bioCount}/150</p>
        </div>

        <div>
          <input type="password" autoComplete="new-password" className="w-full border rounded-md p-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="새 비밀번호(선택, 8~128자)" />
          {!passwordValid && <p className="text-xs text-red-500 mt-1">비밀번호는 8~128자여야 합니다.</p>}
        </div>

        <div>
          <input type="password" autoComplete="new-password" className="w-full border rounded-md p-3" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="새 비밀번호 확인" />
          {!passwordMatch && <p className="text-xs text-red-500 mt-1">비밀번호 확인이 일치하지 않습니다.</p>}
        </div>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="px-4 py-2 rounded-md bg-blue-500 text-white disabled:opacity-50" disabled={!canSave}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
}
