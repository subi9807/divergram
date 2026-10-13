import { useEffect, useState } from 'react';
import { API_BASE } from './lib/api';
import brandLogoUrl from '../../web/public/assets/logo/divergram-logo-blue.png';

const messageFor = (error) => {
  if (error === 'reset_token_expired') return '링크가 만료되었거나 이미 사용되었습니다. 관리자에게 새 링크를 요청해 주세요.';
  if (error === 'invalid_password') return '영문 대문자, 소문자, 숫자를 포함해 8자 이상 입력해 주세요.';
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
};

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'request_failed');
  return body;
}

export function PasswordResetApp() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [account, setAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(token ? 'checking' : 'invalid');
  const [error, setError] = useState(token ? '' : 'reset_token_expired');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/password-reset/${encodeURIComponent(token)}`)
      .then(readJson)
      .then((result) => {
        setAccount(result);
        setStatus('ready');
      })
      .catch((cause) => {
        setError(cause.message || 'request_failed');
        setStatus('invalid');
      });
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('password_mismatch');
      return;
    }
    setStatus('saving');
    try {
      await readJson(await fetch(`${API_BASE}/api/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      }));
      setStatus('complete');
    } catch (cause) {
      setError(cause.message || 'request_failed');
      setStatus('ready');
    }
  };

  const accountLabel = account?.accountScope === 'admin' ? '관리자 회원' : account?.accountScope === 'resort' ? '리조트 회원' : '일반 회원';
  return (
    <main className="password-reset-page">
      <section className="password-reset-card">
        <header>
          <img src={brandLogoUrl} alt="Divergram" />
          <div><strong>DIVERGRAM</strong><span>SECURE ACCOUNT</span></div>
        </header>

        {status === 'checking' && <div className="password-reset-state"><span className="password-reset-spinner" /><h1>링크를 확인하고 있습니다</h1><p>잠시만 기다려 주세요.</p></div>}
        {status === 'invalid' && <div className="password-reset-state is-error"><span>!</span><h1>사용할 수 없는 링크입니다</h1><p>{messageFor(error)}</p></div>}
        {status === 'complete' && <div className="password-reset-state is-success"><span>✓</span><h1>비밀번호가 변경되었습니다</h1><p>새 비밀번호로 로그인해 주세요. 이 링크는 더 이상 사용할 수 없습니다.</p></div>}

        {(status === 'ready' || status === 'saving') && (
          <form onSubmit={submit}>
            <p className="password-reset-eyebrow">PASSWORD RESET</p>
            <h1>새 비밀번호 설정</h1>
            <p className="password-reset-account">{accountLabel} · {account?.email}</p>
            <label><span>새 비밀번호</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
            <label><span>새 비밀번호 확인</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></label>
            <small>영문 대문자, 소문자, 숫자를 포함해 8자 이상 입력해 주세요.</small>
            {error && <p className="password-reset-error">{error === 'password_mismatch' ? '비밀번호가 서로 일치하지 않습니다.' : messageFor(error)}</p>}
            <button type="submit" disabled={status === 'saving'}>{status === 'saving' ? '변경 중...' : '비밀번호 변경'}</button>
          </form>
        )}
      </section>
    </main>
  );
}

