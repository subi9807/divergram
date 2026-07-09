import { useEffect, useMemo, useState } from 'react';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatAuthMethod(user) {
  const methods = Array.isArray(user.auth_methods) ? user.auth_methods : [];
  if (methods.length) return methods.join(' / ');
  return String(user.signup_method || 'email').trim() || 'email';
}

function getUserStatus(user) {
  return user?.is_blocked ? 'blocked' : 'active';
}

function getUserBadgeLabel(user) {
  if (user?.is_blocked) return '차단';
  if (user?.email_verified) return '인증';
  return '정상';
}

function getRoleGroup(user) {
  const role = String(user?.account_type || user?.role || 'user').toLowerCase();
  return role === 'resort' ? 'resort' : role === 'admin' ? 'admin' : 'general';
}

function getCardImage(user) {
  return user.avatar_url || user.profile_image_url || '';
}

function safeString(value) {
  return String(value ?? '').trim();
}

function UserCardActions({ user, onEdit, updateUser, deleteUser, deleteUserPosts }) {
  return (
    <div className="users-card-actions" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="sm ghost" onClick={() => onEdit?.(user)}>
        수정
      </button>
      <button
        type="button"
        className="sm"
        onClick={() => updateUser?.(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}
      >
        {user.role === 'admin' ? '관리자해제' : '관리자지정'}
      </button>
      <button
        type="button"
        className="sm"
        onClick={() => updateUser?.(user.id, { is_blocked: !user.is_blocked })}
      >
        {user.is_blocked ? '차단해제' : '차단'}
      </button>
      <button
        type="button"
        className="sm danger"
        onClick={() => deleteUser?.(user.id)}
      >
        삭제
      </button>
      <button
        type="button"
        className="sm"
        onClick={() => deleteUserPosts?.(user.id)}
        title="이 회원의 게시물만 모두 삭제"
      >
        게시물 삭제
      </button>
    </div>
  );
}

function UserEditModal({ user, onClose, onSave, busy }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setDraft(null);
      setError('');
      return;
    }
    setDraft({
      email: safeString(user.email),
      username: safeString(user.username),
      full_name: safeString(user.full_name),
      contact_phone: safeString(user.contact_phone),
      bio: safeString(user.bio),
      avatar_url: safeString(user.avatar_url),
      website: safeString(user.website),
      scuba_level: safeString(user.scuba_level),
      freediving_level: safeString(user.freediving_level),
      account_type: safeString(user.account_type || user.role || 'personal') || 'personal',
      role: safeString(user.role || 'user') || 'user',
      email_verified: !!user.email_verified,
      is_blocked: !!user.is_blocked,
    });
    setError('');
  }, [user]);

  if (!user || !draft) return null;

  const submit = async (event) => {
    event.preventDefault();
    try {
      await onSave?.(user.id, {
        email: draft.email,
        username: draft.username,
        full_name: draft.full_name,
        contact_phone: draft.contact_phone,
        bio: draft.bio,
        avatar_url: draft.avatar_url,
        website: draft.website,
        scuba_level: draft.scuba_level,
        freediving_level: draft.freediving_level,
        account_type: draft.account_type,
        role: draft.role,
        emailVerified: draft.email_verified,
        is_blocked: draft.is_blocked,
      });
      onClose?.();
    } catch (nextError) {
      setError(nextError?.message || '저장 실패');
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-panel users-edit-modal" role="dialog" aria-modal="true" aria-label="회원 수정" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>회원 수정</h3>
            <p>기본 정보와 상태를 바로 수정할 수 있어.</p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>닫기</button>
        </div>

        <div className="users-edit-summary">
          <div className="users-edit-avatar">
            {getCardImage(user) ? (
              <img src={getCardImage(user)} alt={user.username || user.full_name || 'user'} />
            ) : (
              <span>{(user.username || user.full_name || '?')[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="users-edit-summary-main">
            <strong>{user.full_name || user.username || '-'}</strong>
            <p>{user.email || '-'}</p>
            <small>ID: {user.id}</small>
          </div>
        </div>

        <form className="users-edit-form" onSubmit={submit}>
          <div className="users-edit-grid">
            <label>
              <span>이메일</span>
              <input value={draft.email} onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))} />
            </label>
            <label>
              <span>사용자명</span>
              <input value={draft.username} onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))} />
            </label>
            <label>
              <span>이름</span>
              <input value={draft.full_name} onChange={(e) => setDraft((prev) => ({ ...prev, full_name: e.target.value }))} />
            </label>
            <label>
              <span>연락처</span>
              <input type="tel" value={draft.contact_phone} onChange={(e) => setDraft((prev) => ({ ...prev, contact_phone: e.target.value }))} placeholder="010-0000-0000" />
            </label>
            <label>
              <span>웹사이트</span>
              <input value={draft.website} onChange={(e) => setDraft((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://..." />
            </label>
            <label>
              <span>프로필 이미지</span>
              <input value={draft.avatar_url} onChange={(e) => setDraft((prev) => ({ ...prev, avatar_url: e.target.value }))} placeholder="https://..." />
            </label>
            <label>
              <span>계정 형태</span>
              <select value={draft.account_type} onChange={(e) => setDraft((prev) => ({ ...prev, account_type: e.target.value }))}>
                <option value="personal">일반</option>
                <option value="resort">리조트</option>
              </select>
            </label>
            <label>
              <span>권한</span>
              <select value={draft.role} onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="user">사용자</option>
                <option value="admin">관리자</option>
              </select>
            </label>
            <label className="users-edit-grid-wide">
              <span>소개</span>
              <textarea value={draft.bio} onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))} placeholder="자기소개" />
            </label>
            <label>
              <span>스쿠버 레벨</span>
              <input value={draft.scuba_level} onChange={(e) => setDraft((prev) => ({ ...prev, scuba_level: e.target.value }))} />
            </label>
            <label>
              <span>프리다이빙 레벨</span>
              <input value={draft.freediving_level} onChange={(e) => setDraft((prev) => ({ ...prev, freediving_level: e.target.value }))} />
            </label>
          </div>

          <div className="users-edit-toggles">
          <label className="detail-box detail-box--toggle">
            <input type="checkbox" checked={draft.email_verified} onChange={(e) => setDraft((prev) => ({ ...prev, email_verified: e.target.checked }))} />
            <span>이메일 인증</span>
          </label>
          <label className="detail-box detail-box--toggle">
              <input type="checkbox" checked={draft.is_blocked} onChange={(e) => setDraft((prev) => ({ ...prev, is_blocked: e.target.checked }))} />
              <span>차단 상태</span>
          </label>
          </div>

          <div className="modal-footer modal-footer--start">
            <button type="submit" disabled={busy}>{busy ? '저장 중...' : '회원 정보 저장'}</button>
            <button type="button" className="ghost" onClick={onClose}>취소</button>
          </div>

          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default function UsersSection({
  users,
  query,
  setQuery,
  refresh,
  updateUser,
  deleteUserPosts,
  deleteUser,
  roleFilter,
  setRoleFilter,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [authFilter, setAuthFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [editBusy, setEditBusy] = useState(false);

  const visibleUsers = useMemo(() => {
    const search = String(query || '').trim().toLowerCase();
    return (users || []).filter((user) => {
      const roleGroup = getRoleGroup(user);
      const status = user?.is_blocked ? 'blocked' : 'active';
      const verified = user?.email_verified ? 'verified' : 'unverified';
      const auth = String(user?.signup_method || 'email').toLowerCase();
      const methods = Array.isArray(user?.auth_methods)
        ? user.auth_methods.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
        : [];
      const normalizedMethods = methods.length ? methods : [auth];
      const text = [
        user?.username,
        user?.full_name,
        user?.email,
        user?.id,
        user?.website,
        user?.bio,
        user?.contact_phone,
        user?.scuba_level,
        user?.freediving_level,
      ]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const roleOk = roleFilter === 'all' || roleFilter === roleGroup;
      const statusOk = statusFilter === 'all' || statusFilter === status || statusFilter === verified;
      const authOk = authFilter === 'all' || normalizedMethods.includes(authFilter);
      return (!search || text.includes(search)) && roleOk && statusOk && authOk;
    });
  }, [authFilter, query, roleFilter, statusFilter, users]);

  const openEdit = (user) => setEditingUser(user || null);
  const closeEdit = () => setEditingUser(null);

  const saveEdit = async (id, payload) => {
    setEditBusy(true);
    try {
      await updateUser?.(id, payload);
      closeEdit();
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <div className="card users-card-wrap">
      <div className="users-heading">
        <h2>사용자 관리</h2>
      </div>

      <div className="users-toolbar users-toolbar--card">
        <div className="users-search-row users-search-row--slim">
          <input
            value={query}
            onChange={(e) => setQuery?.(e.target.value)}
            placeholder="이메일, 닉네임, 이름으로 검색"
          />
        </div>
        <div className="users-select-row">
          <label className="users-select-field users-select-field--compact">
            <span className="sr-only">역할</span>
            <select
              aria-label="역할"
              value={roleFilter}
              onChange={(e) => {
                const next = e.target.value;
                setRoleFilter?.(next);
                refresh?.({ memberRole: next });
              }}
            >
              <option value="all">전체</option>
              <option value="general">일반</option>
              <option value="resort">리조트</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <label className="users-select-field users-select-field--compact">
            <span className="sr-only">상태</span>
            <select aria-label="상태" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="active">정상</option>
              <option value="blocked">차단</option>
              <option value="verified">인증</option>
              <option value="unverified">미인증</option>
            </select>
          </label>
          <label className="users-select-field users-select-field--compact">
            <span className="sr-only">가입방식</span>
            <select aria-label="가입방식" value={authFilter} onChange={(e) => setAuthFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="email">이메일</option>
              <option value="google">Google</option>
              <option value="apple">Apple</option>
              <option value="kakao">Kakao</option>
              <option value="facebook">Facebook</option>
            </select>
          </label>
        </div>
      </div>

      {visibleUsers.length === 0 ? (
        <p className="users-empty">표시할 회원이 없습니다.</p>
      ) : (
        <div className="users-cards-grid">
          {visibleUsers.map((user) => {
            const roleGroup = getRoleGroup(user);
            const thumb = getCardImage(user);
            const photoCount = Number(user?.post_count || 0);
            return (
              <article
                key={user.id}
                className="users-card"
                tabIndex={0}
                role="button"
                onClick={() => openEdit(user)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEdit(user);
                  }
                }}
              >
                <div className="users-card-media">
                  {thumb ? (
                    <img src={thumb} alt={user.username || user.full_name || 'user'} />
                  ) : (
                    <div className="users-card-empty">{(user.username || user.full_name || '?')[0]?.toUpperCase()}</div>
                  )}
                  <div className="users-card-overlay">
                    <div className="users-card-overlay-top">
                      <div>
                        <h3>{user.full_name || user.username || '-'}</h3>
                        <p>{user.email || '-'}</p>
                      </div>
                      <span className={`badge ${roleGroup === 'admin' ? 'admin' : 'user'}`}>{roleGroup}</span>
                    </div>

                    <div className="users-card-meta">
                      <span>ID <strong>{user.id}</strong></span>
                      <span>가입일 <strong>{formatDate(user.created_at)}</strong></span>
                      <span>게시물 <strong>{photoCount}</strong></span>
                    </div>

                    <div className="users-card-body">
                      <div>
                        <span>닉네임</span>
                        <p>{user.username || '-'}</p>
                      </div>
                      <div>
                        <span>이메일</span>
                        <p>{user.email || '-'}</p>
                      </div>
                    </div>

                    <div className="users-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="sm ghost" onClick={() => openEdit(user)}>수정</button>
                      <button type="button" className="sm" onClick={() => updateUser?.(user.id, { role: user.role === 'admin' ? 'user' : 'admin' })}>
                        {user.role === 'admin' ? '관리자해제' : '관리자지정'}
                      </button>
                      <button type="button" className="sm" onClick={() => updateUser?.(user.id, { is_blocked: !user.is_blocked })}>
                        {user.is_blocked ? '차단해제' : '차단'}
                      </button>
                      <button type="button" className="sm danger" onClick={() => deleteUser?.(user.id)}>삭제</button>
                      <button type="button" className="sm" onClick={() => deleteUserPosts?.(user.id)}>게시물 삭제</button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <UserEditModal user={editingUser} onClose={closeEdit} onSave={saveEdit} busy={editBusy} />
    </div>
  );
}
