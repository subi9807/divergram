import { useEffect, useMemo, useState } from 'react';
import Pagination, { usePagination } from '../components/Pagination';

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

function formatDateOnly(value) {
  return formatDate(value).replace(/\s(오전|오후).+$/, '');
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
  const role = String(user?.role || '').toLowerCase();
  const accountType = String(user?.account_type || '').toLowerCase();
  if (role === 'admin') return 'admin';
  if (accountType === 'resort' || role === 'resort') return 'resort';
  return 'general';
}

function getCardImage(user) {
  return user.avatar_url || user.profile_image_url || '';
}

function safeString(value) {
  return String(value ?? '').trim();
}

function UserListActions({ user, roleGroup, onEdit, updateUser, sendPasswordResetEmail, deleteUser, deleteUserPosts }) {
  if (user?.is_default_admin) {
    return (
      <div className="users-card-actions" onClick={(e) => e.stopPropagation()}>
        <span className="member-protected-label">기본 관리자 보호됨</span>
        <button type="button" className="sm ghost" onClick={() => onEdit?.(user)}>
          수정
        </button>
        <button type="button" className="sm" onClick={() => sendPasswordResetEmail?.(user)} title="등록 이메일로 비밀번호 재설정 링크 전송">
          비번 재설정
        </button>
      </div>
    );
  }

  return (
    <div className="users-card-actions" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="sm ghost" onClick={() => onEdit?.(user)}>
        수정
      </button>
      <button type="button" className="sm" onClick={() => sendPasswordResetEmail?.(user)} title="등록 이메일로 비밀번호 재설정 링크 전송">
        비번 재설정
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
      {roleGroup === 'general' && (
        <button
          type="button"
          className="sm"
          onClick={() => deleteUserPosts?.(user.id)}
          title="이 회원의 게시물만 모두 삭제"
        >
          게시물 관리
        </button>
      )}
    </div>
  );
}

function MemberCard({ user, roleGroup, onEdit, updateUser, sendPasswordResetEmail, deleteUser, deleteUserPosts }) {
  const thumb = getCardImage(user);
  const postCount = Number(user?.post_count || 0);
  const roleLabel = roleGroup === 'resort' ? '리조트 운영 계정' : roleGroup === 'admin' ? '관리자 운영 계정' : '일반 다이버 계정';
  const resortName = safeString(user?.resort_name || user?.resort?.name || user?.organization_name) || '연결된 리조트 없음';
  const openEdit = () => onEdit?.(user);
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openEdit();
    }
  };

  return (
    <article className={`member-profile-card is-${roleGroup}`} tabIndex={0} onClick={openEdit} onKeyDown={handleKeyDown}>
      <div className="member-profile-card-head">
        <div className="member-profile-avatar">
          {thumb ? <img src={thumb} alt={user.username || user.full_name || '회원'} /> : <span>{(user.username || user.full_name || '?')[0]?.toUpperCase()}</span>}
        </div>
        <div className="member-profile-identity">
          <span className="member-profile-kicker">{roleLabel}</span>
          <h3>{user.full_name || user.username || '-'}</h3>
          <p>{user.email || '-'}</p>
          <small>@{user.username || '-'} · ID {user.id}</small>
        </div>
        <div className="member-profile-badges">
          <span className={`badge ${getUserStatus(user)}`}>{getUserBadgeLabel(user)}</span>
          <span className={`badge ${user.email_verified ? 'active' : 'blocked'}`}>{user.email_verified ? '이메일 인증' : '미인증'}</span>
        </div>
      </div>

      {roleGroup === 'general' && (
        <div className="member-profile-summary">
          <div><span>가입 방식</span><strong>{formatAuthMethod(user)}</strong></div>
          <div><span>게시물</span><strong>{postCount}개</strong></div>
          <div><span>가입일</span><strong>{formatDateOnly(user.created_at)}</strong></div>
        </div>
      )}
      {roleGroup === 'resort' && (
        <div className="member-profile-summary">
          <div className="member-profile-summary-wide"><span>연결 리조트</span><strong>{resortName}</strong></div>
          <div><span>로그인</span><strong>이메일</strong></div>
          <div><span>가입일</span><strong>{formatDateOnly(user.created_at)}</strong></div>
        </div>
      )}
      {roleGroup === 'admin' && (
        <div className="member-profile-summary">
          <div className="member-profile-summary-wide"><span>접근 범위</span><strong>{user.is_default_admin ? '기본 관리자 · 전체' : '관리자 콘솔 전체'}</strong></div>
          <div><span>로그인</span><strong>{formatAuthMethod(user)}</strong></div>
          <div><span>최근 가입</span><strong>{formatDateOnly(user.created_at)}</strong></div>
        </div>
      )}

      <div className="member-profile-actions" onClick={(event) => event.stopPropagation()}>
        <UserListActions user={user} roleGroup={roleGroup} onEdit={onEdit} updateUser={updateUser} sendPasswordResetEmail={sendPasswordResetEmail} deleteUser={deleteUser} deleteUserPosts={deleteUserPosts} />
      </div>
    </article>
  );
}

function MemberListRow({ user, roleGroup, onEdit, updateUser, sendPasswordResetEmail, deleteUser, deleteUserPosts }) {
  const thumb = getCardImage(user);
  const postCount = Number(user?.post_count || 0);
  const resortName = safeString(user?.resort_name || user?.resort?.name || user?.organization_name) || '연결된 리조트 없음';
  const roleLabel = roleGroup === 'resort' ? '리조트 회원' : roleGroup === 'admin' ? '관리자 회원' : '일반 회원';
  const openEdit = () => onEdit?.(user);

  return (
    <div className={`member-list member-list-row is-${roleGroup}`} role="button" tabIndex={0} onClick={openEdit} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEdit();
      }
    }}>
      <div className="member-list-identity">
        <div className="member-profile-avatar">
          {thumb ? <img src={thumb} alt={user.username || user.full_name || '회원'} /> : <span>{(user.username || user.full_name || '?')[0]?.toUpperCase()}</span>}
        </div>
        <div>
          <strong>{user.full_name || user.username || '-'}</strong>
          <span>{user.email || '-'}</span>
          <small>@{user.username || '-'} · ID {user.id}</small>
        </div>
      </div>
      <div className="member-list-account">
        <span className={`member-list-role role-${roleGroup}`}>{roleLabel}</span>
        <small>{formatAuthMethod(user)}</small>
      </div>
      <div className="member-list-info">
        <span>{roleGroup === 'resort' ? resortName : roleGroup === 'admin' ? (user.is_default_admin ? '기본 관리자 · 전체' : '관리자 콘솔 전체') : `${postCount}개 게시물`}</span>
        <small>{formatDateOnly(user.created_at)}</small>
      </div>
      <div className="member-list-status">
        <span className={`badge ${getUserStatus(user)}`}>{getUserBadgeLabel(user)}</span>
        <span className={`badge ${user.email_verified ? 'active' : 'blocked'}`}>{user.email_verified ? '이메일 인증' : '미인증'}</span>
      </div>
      <UserListActions user={user} roleGroup={roleGroup} onEdit={onEdit} updateUser={updateUser} sendPasswordResetEmail={sendPasswordResetEmail} deleteUser={deleteUser} deleteUserPosts={deleteUserPosts} />
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

  const protectedAdmin = !!user.is_default_admin;
  const roleGroup = getRoleGroup(user);
  const roleTitle = roleGroup === 'resort' ? '리조트 회원' : roleGroup === 'admin' ? '관리자 회원' : '일반 회원';

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
            <span className={`users-edit-role role-${roleGroup}`}>{roleTitle}</span>
            <h3>{roleTitle} 수정</h3>
            <p>회원 정보와 계정 상태를 한 화면에서 관리합니다.</p>
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
          <section className="users-edit-section">
            <div className="users-edit-section-head">
              <strong>기본 정보</strong>
              <span>로그인과 회원 식별에 사용하는 정보입니다.</span>
            </div>
            <div className="users-edit-grid">
              <label>
                <span>이름</span>
                <input value={draft.full_name} onChange={(e) => setDraft((prev) => ({ ...prev, full_name: e.target.value }))} />
              </label>
              <label>
                <span>사용자명</span>
                <input value={draft.username} onChange={(e) => setDraft((prev) => ({ ...prev, username: e.target.value }))} />
              </label>
              <label>
                <span>이메일</span>
                <input type="email" value={draft.email} disabled={protectedAdmin} onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))} />
              </label>
              <label>
                <span>연락처</span>
                <input type="tel" value={draft.contact_phone} onChange={(e) => setDraft((prev) => ({ ...prev, contact_phone: e.target.value }))} placeholder="010-0000-0000" />
              </label>
            </div>
          </section>

          <section className="users-edit-section">
            <div className="users-edit-section-head">
              <strong>계정 및 상태</strong>
              <span>회원 구분과 서비스 접근 상태를 설정합니다.</span>
            </div>
            <div className="users-edit-grid">
              <label>
                <span>계정 형태</span>
                <select value={draft.account_type} disabled={protectedAdmin} onChange={(e) => setDraft((prev) => ({ ...prev, account_type: e.target.value }))}>
                  <option value="personal">일반</option>
                  <option value="resort">리조트</option>
                </select>
              </label>
              <label>
                <span>권한</span>
                <select value={draft.role} disabled={protectedAdmin} onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))}>
                  <option value="user">사용자</option>
                  <option value="admin">관리자</option>
                </select>
              </label>
            </div>
            <div className="users-edit-toggles">
              <label className="users-edit-toggle">
                <input type="checkbox" checked={draft.email_verified} onChange={(e) => setDraft((prev) => ({ ...prev, email_verified: e.target.checked }))} />
                <span><strong>이메일 인증</strong><small>인증 완료 상태로 표시합니다.</small></span>
              </label>
              <label className="users-edit-toggle">
                <input type="checkbox" checked={draft.is_blocked} disabled={protectedAdmin} onChange={(e) => setDraft((prev) => ({ ...prev, is_blocked: e.target.checked }))} />
                <span><strong>계정 차단</strong><small>로그인과 서비스 이용을 제한합니다.</small></span>
              </label>
            </div>
          </section>

          <section className="users-edit-section">
            <div className="users-edit-section-head">
              <strong>프로필 정보</strong>
              <span>서비스에 표시되는 공개 프로필 정보입니다.</span>
            </div>
            <div className="users-edit-grid">
              <label>
                <span>웹사이트</span>
                <input value={draft.website} onChange={(e) => setDraft((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://..." />
              </label>
              <label>
                <span>프로필 이미지 주소</span>
                <input value={draft.avatar_url} onChange={(e) => setDraft((prev) => ({ ...prev, avatar_url: e.target.value }))} placeholder="https://..." />
              </label>
              <label className="users-edit-grid-wide">
                <span>소개</span>
                <textarea value={draft.bio} onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))} placeholder="회원 소개를 입력하세요." />
              </label>
            </div>
          </section>

          {roleGroup === 'general' && (
            <section className="users-edit-section">
              <div className="users-edit-section-head">
                <strong>다이빙 정보</strong>
                <span>회원이 등록한 다이빙 자격 수준입니다.</span>
              </div>
              <div className="users-edit-grid">
                <label>
                  <span>스쿠버 레벨</span>
                  <input value={draft.scuba_level} onChange={(e) => setDraft((prev) => ({ ...prev, scuba_level: e.target.value }))} />
                </label>
                <label>
                  <span>프리다이빙 레벨</span>
                  <input value={draft.freediving_level} onChange={(e) => setDraft((prev) => ({ ...prev, freediving_level: e.target.value }))} />
                </label>
              </div>
            </section>
          )}

          {protectedAdmin && <p className="users-edit-protected">기본 관리자 계정은 이메일·권한·계정 형태를 변경하거나 차단할 수 없습니다.</p>}

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
  sendPasswordResetEmail,
  deleteUserPosts,
  deleteUser,
  roleFilter,
  setRoleFilter,
  fixedRole = false,
  title = '사용자 관리',
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
  const pagination = usePagination(visibleUsers, 12, `${query}:${roleFilter}:${statusFilter}:${authFilter}`);

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
        <h2>{title}</h2>
        <span className="operation-result-count">검색 결과 <strong>{visibleUsers.length}</strong>명</span>
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
          {!fixedRole && (
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
          )}
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
        <div className="member-list-wrap">
          <div className="member-list member-list-head" aria-hidden="true">
            <span>회원</span>
            <span>계정</span>
            <span>가입 정보</span>
            <span>상태</span>
            <span>관리</span>
          </div>
          {pagination.pageItems.map((user) => (
            <MemberListRow
              key={user.id}
              user={user}
              roleGroup={fixedRole ? roleFilter : getRoleGroup(user)}
              onEdit={openEdit}
              updateUser={updateUser}
              sendPasswordResetEmail={sendPasswordResetEmail}
              deleteUser={deleteUser}
              deleteUserPosts={deleteUserPosts}
            />
          ))}
        </div>
      )}

      <Pagination {...pagination} label="회원" />

      <UserEditModal user={editingUser} onClose={closeEdit} onSave={saveEdit} busy={editBusy} />
    </div>
  );
}
