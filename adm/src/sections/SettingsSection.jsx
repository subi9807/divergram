import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function SettingsSection({ refresh, refreshSession, sessionUser, reports = [], certifications = [], reportBreakdown = {} }) {
  const [settingsTab, setSettingsTab] = useState('profile');
  const profileBaselineRef = useRef({
    full_name: '',
    contact_phone: '',
    email: '',
  });
  const [profileForm, setProfileForm] = useState({
    full_name: sessionUser?.full_name || '',
    contact_phone: sessionUser?.contact_phone || '',
    email: sessionUser?.email || '',
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileResult, setProfileResult] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    password: '',
    passwordConfirm: '',
  });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordResult, setPasswordResult] = useState('');

  useEffect(() => {
    const nextProfile = {
      full_name: sessionUser?.full_name || sessionUser?.profile?.full_name || '',
      contact_phone: sessionUser?.contact_phone || sessionUser?.profile?.contact_phone || '',
      email: sessionUser?.email || '',
    };
    profileBaselineRef.current = nextProfile;
    setProfileForm((prev) => ({
      ...prev,
      ...nextProfile,
    }));
  }, [sessionUser?.email, sessionUser?.full_name, sessionUser?.contact_phone, sessionUser?.profile?.full_name, sessionUser?.profile?.contact_phone]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError('');
    setProfileResult('');
    try {
      const full_name = String(profileForm.full_name || '').trim();
      const contact_phone = String(profileForm.contact_phone || '').trim();
      const email = String(profileForm.email || '').trim();

      const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');
      const baseline = profileBaselineRef.current || {};
      const currentContactPhone = normalizePhone(baseline.contact_phone);
      const currentEmail = String(baseline.email || '').trim();

      const payload = {
        full_name,
        contact_phone,
        fullName: full_name,
        contactPhone: contact_phone,
      };
      if (email && email !== currentEmail) payload.email = email;
      const result = await api('/api/auth/me', { method: 'PATCH', body: payload });
      if (result?.emailVerificationRequested) {
        setProfileResult('저장 완료. 이메일 변경이 있으면 인증 메일을 확인해.');
      } else {
        setProfileResult('저장 완료.');
      }
      profileBaselineRef.current = {
        full_name,
        contact_phone,
        email: email || currentEmail,
      };
      await refresh?.();
      await refreshSession?.();
    } catch (error) {
      setProfileError(error.message === 'no_changes' ? '변경할 내용이 없어.' : error.message || '프로필 저장 실패');
    } finally {
      setProfileBusy(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordError('');
    setPasswordResult('');
    try {
      const currentPassword = String(passwordForm.currentPassword || '');
      const password = String(passwordForm.password || '');
      const passwordConfirm = String(passwordForm.passwordConfirm || '');
      if (!currentPassword) throw new Error('current_password_required');
      if (!password || !passwordConfirm) throw new Error('password_required');
      if (password !== passwordConfirm) throw new Error('password_mismatch');

      await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          currentPassword,
          password,
        },
      });
      setPasswordResult('비밀번호가 변경됐어.');
      setPasswordForm({ currentPassword: '', password: '', passwordConfirm: '' });
      await refresh?.();
      await refreshSession?.();
    } catch (error) {
      setPasswordError(
        error.message === 'current_password_required'
          ? '현재 비밀번호를 입력해줘.'
          : error.message === 'password_required'
            ? '새 비밀번호를 입력해줘.'
            : error.message === 'password_mismatch'
              ? '새 비밀번호 확인이 일치하지 않아.'
              : error.message === 'invalid_current_password'
                ? '현재 비밀번호가 맞지 않아.'
                : error.message || '비밀번호 변경 실패',
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="card admin-settings-card">
      <div className="settings-menu">
        <button type="button" className={settingsTab === 'profile' ? 'chip active' : 'chip'} onClick={() => setSettingsTab('profile')}>내 정보</button>
        <button type="button" className={settingsTab === 'password' ? 'chip active' : 'chip'} onClick={() => setSettingsTab('password')}>비밀번호 변경</button>
      </div>

      {settingsTab === 'profile' && (
        <form className="profile-edit-card" onSubmit={saveProfile}>
          <div className="panel-head panel-head-tight">
            <div>
              <strong>내 정보</strong>
              <span className="muted">이름, 연락처, 이메일을 수정할 수 있어.</span>
            </div>
          </div>
          <div className="field-grid profile-grid profile-edit-grid">
            <label><span>이름</span><input value={profileForm.full_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, full_name: e.target.value }))} placeholder="홍길동" /></label>
            <label><span>연락처</span><input type="tel" value={profileForm.contact_phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, contact_phone: e.target.value }))} placeholder="010-0000-0000" /></label>
            <label className="profile-span-2"><span>이메일</span><input type="email" value={profileForm.email} onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" /></label>
          </div>
          <div className="detail-actions detail-actions-tight">
            <button type="submit" disabled={profileBusy}>{profileBusy ? '저장 중...' : '정보 저장'}</button>
            <button type="button" onClick={() => setProfileForm({
              full_name: sessionUser?.full_name || sessionUser?.profile?.full_name || '',
              contact_phone: sessionUser?.contact_phone || sessionUser?.profile?.contact_phone || '',
              email: sessionUser?.email || '',
            })} disabled={profileBusy}>초기화</button>
          </div>
          {profileError && <p className="error">{profileError}</p>}
          {profileResult && <p className="muted">{profileResult}</p>}
        </form>
      )}

      {settingsTab === 'password' && (
        <form className="profile-edit-card" onSubmit={savePassword}>
          <div className="panel-head">
            <strong>비밀번호 변경</strong>
            <span className="muted">현재 비밀번호를 먼저 입력해야 새 비밀번호로 바뀌어.</span>
          </div>
          <div className="field-grid profile-grid">
            <label><span>현재 비밀번호</span><input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))} placeholder="현재 비밀번호" /></label>
            <label><span>새 비밀번호</span><input type="password" autoComplete="new-password" value={passwordForm.password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="새 비밀번호" /></label>
          </div>
          <div className="field-grid profile-grid">
            <label><span>새 비밀번호 확인</span><input type="password" autoComplete="new-password" value={passwordForm.passwordConfirm} onChange={(e) => setPasswordForm((prev) => ({ ...prev, passwordConfirm: e.target.value }))} placeholder="한 번 더 입력" /></label>
            <div />
          </div>
          <div className="detail-actions">
            <button type="submit" disabled={passwordBusy}>{passwordBusy ? '변경 중...' : '비밀번호 변경'}</button>
            <button type="button" onClick={() => setPasswordForm({ currentPassword: '', password: '', passwordConfirm: '' })} disabled={passwordBusy}>초기화</button>
          </div>
          {passwordError && <p className="error">{passwordError}</p>}
          {passwordResult && <p className="muted">{passwordResult}</p>}
        </form>
      )}

    </div>
  );
}
