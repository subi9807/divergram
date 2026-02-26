import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000';

const strongPassword = (v: string) => /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9]/.test(v);

export default function PersonalInfoEdit() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [accountType, setAccountType] = useState<'personal' | 'resort'>('personal');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [emailNeedsVerify, setEmailNeedsVerify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [initial, setInitial] = useState({ email: '', username: '', fullName: '', bio: '', accountType: 'personal' as 'personal' | 'resort' });

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
          accountType: (data.account_type || 'personal') as 'personal' | 'resort',
        };
        setUsername(next.username);
        setFullName(next.fullName);
        setBio(next.bio);
        setAccountType(next.accountType);
        setInitial(next);
      }
    })();
  }, [user]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const usernameValid = /^[a-zA-Z0-9_]{4,32}$/.test(username);
  const passwordValid = password.length === 0 || (password.length >= 8 && password.length <= 128 && strongPassword(password));
  const passwordMatch = password === passwordConfirm;
  const bioCount = bio.length;

  const isDirty = useMemo(() => {
    return (
      email !== initial.email ||
      username !== initial.username ||
      fullName !== initial.fullName ||
      bio !== initial.bio ||
      accountType !== initial.accountType ||
      password.length > 0 ||
      passwordConfirm.length > 0
    );
  }, [email, username, fullName, bio, accountType, password, passwordConfirm, initial]);

  const canSave = emailValid && usernameValid && passwordValid && passwordMatch && isDirty && !saving;

  const onSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const token = localStorage.getItem('dg_token') || '';
      const payload: any = { username };
      if (email !== initial.email) payload.email = email;
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

      await db.from('profiles').update({ username, full_name: fullName, bio, account_type: accountType }).eq('id', user.id);

      setInitial((prev) => ({ ...prev, username, fullName, bio, accountType, email: j.emailVerificationRequested ? prev.email : email }));
      setPassword('');
      setPasswordConfirm('');

      if (j.emailVerificationRequested) {
        setEmailNeedsVerify(true);
        setMessage('인증 메일을 전송했습니다. 받은 코드 6자리를 입력해 인증을 완료하세요.');
      } else {
        setEmailNeedsVerify(false);
        setMessage('개인정보가 수정되었습니다.');
      }
    } catch (e: any) {
      setError(e.message || '수정 실패');
    } finally {
      setSaving(false);
    }
  };

  const onConfirmEmail = async () => {
    const token = localStorage.getItem('dg_token') || '';
    if (!/^\d{6}$/.test(verifyCode)) {
      setError('인증코드는 6자리 숫자입니다.');
      return;
    }

    setVerifying(true);
    setError('');
    setMessage('');
    try {
      const r = await fetch(`${API_BASE}/api/auth/email/verify/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: verifyCode }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'verify_failed');

      setInitial((prev) => ({ ...prev, email: j.email || email }));
      setEmail(j.email || email);
      setVerifyCode('');
      setEmailNeedsVerify(false);
      setMessage('이메일 인증이 완료되었습니다.');
    } catch (e: any) {
      setError(e.message || '이메일 인증 실패');
    } finally {
      setVerifying(false);
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
          <input autoComplete="username" className="w-full border rounded-md p-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="사용자명 (4~32자, 영문/숫자/_)" />
          {!usernameValid && <p className="text-xs text-red-500 mt-1">사용자명은 4~32자, 영문/숫자/_만 가능합니다.</p>}
        </div>

        <div className="border rounded-md p-3">
          <p className="text-sm mb-2">계정 유형</p>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={accountType === 'personal'} onChange={() => setAccountType('personal')} />
              개인
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={accountType === 'resort'} onChange={() => setAccountType('resort')} />
              리조트
            </label>
          </div>
        </div>

        <input autoComplete="name" className="w-full border rounded-md p-3" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="이름" />

        <div>
          <textarea className="w-full border rounded-md p-3 min-h-24" maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="자기소개" />
          <p className="text-xs text-gray-500 mt-1">{bioCount}/300</p>
        </div>

        <div>
          <input type="password" autoComplete="new-password" className="w-full border rounded-md p-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="새 비밀번호(선택, 8~128자)" />
          {!passwordValid && <p className="text-xs text-red-500 mt-1">비밀번호는 8~128자 + 대문자/소문자/숫자/특수문자를 포함해야 합니다.</p>}
        </div>

        <div>
          <input type="password" autoComplete="new-password" className="w-full border rounded-md p-3" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="새 비밀번호 확인" />
          {!passwordMatch && <p className="text-xs text-red-500 mt-1">비밀번호 확인이 일치하지 않습니다.</p>}
        </div>

        {emailNeedsVerify && (
          <div className="rounded-md border p-3 bg-yellow-50">
            <p className="text-sm mb-2">이메일 인증이 필요합니다. 메일로 받은 6자리 코드를 입력하세요.</p>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-md p-2"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                maxLength={6}
                placeholder="인증코드 6자리"
              />
              <button type="button" onClick={onConfirmEmail} disabled={verifying} className="px-3 py-2 rounded-md bg-gray-900 text-white disabled:opacity-50">
                {verifying ? '확인 중...' : '인증 확인'}
              </button>
            </div>
          </div>
        )}

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="px-4 py-2 rounded-md bg-blue-500 text-white disabled:opacity-50" disabled={!canSave}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  );
}
