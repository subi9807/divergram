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

function UserCardActions({ user, updateUser, deleteUserPosts, deleteUser }) {
  return (
    <div className="actions" onClick={(e) => e.stopPropagation()}>
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
        onClick={() => updateUser?.(user.id, { account_type: user.account_type === 'resort' ? 'personal' : 'resort' })}
      >
        {user.account_type === 'resort' ? '일반회원 전환' : '리조트회원 전환'}
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
        onClick={() => deleteUserPosts?.(user.id)}
        title="이 회원의 게시물만 모두 삭제"
      >
        게시물 전체 삭제
      </button>
      <button
        type="button"
        className="sm danger"
        onClick={() => deleteUser?.(user.id)}
        title="이 회원과 게시물을 모두 삭제"
      >
        회원 삭제
      </button>
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
  roleCounts = {},
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [authFilter, setAuthFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [editForm, setEditForm] = useState(null);

  const visibleUsers = useMemo(() => {
    return (users || []).filter((user) => {
      const status = user?.is_blocked ? 'blocked' : 'active';
      const verified = user?.email_verified ? 'verified' : 'unverified';
      const auth = String(user?.signup_method || 'email').toLowerCase();
      const methods = Array.isArray(user?.auth_methods) ? user.auth_methods.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean) : [];
      const normalizedMethods = methods.length ? methods : [auth];
      const statusOk = statusFilter === 'all' || statusFilter === status || statusFilter === verified;
      const authOk = authFilter === 'all' || normalizedMethods.includes(authFilter);
      return statusOk && authOk;
    });
  }, [authFilter, statusFilter, users]);

  const userSummary = useMemo(() => {
    const counts = { active: 0, blocked: 0, verified: 0, unverified: 0, google: 0, apple: 0, kakao: 0, facebook: 0, email: 0 };
    for (const user of users || []) {
      const auth = String(user?.signup_method || 'email').toLowerCase();
      if (user?.is_blocked) counts.blocked += 1;
      else counts.active += 1;
      if (user?.email_verified) counts.verified += 1;
      else counts.unverified += 1;
      if (auth in counts) counts[auth] += 1;
    }
    return counts;
  }, [users]);

  const selectedUser = useMemo(() => {
    if (!visibleUsers.length) return null;
    return visibleUsers.find((user) => String(user.id) === String(selectedUserId)) || visibleUsers[0] || null;
  }, [selectedUserId, visibleUsers]);

  useEffect(() => {
    if (!visibleUsers.length) {
      setSelectedUserId('');
      return;
    }
    const selectedStillVisible = visibleUsers.some((user) => String(user.id) === String(selectedUserId));
    if (!selectedStillVisible) setSelectedUserId(String(visibleUsers[0].id));
  }, [selectedUserId, visibleUsers]);

  const selectedAuthMethods = useMemo(() => {
    const methods = Array.isArray(selectedUser?.auth_methods) ? selectedUser.auth_methods : [];
    const merged = methods.length ? methods : [selectedUser?.signup_method || 'email'];
    return Array.from(new Set(merged.map((item) => String(item || '').trim()).filter(Boolean)));
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedUser) {
      setEditForm(null);
      return;
    }
    setEditForm({
      username: selectedUser.username || '',
      email: selectedUser.email || '',
      full_name: selectedUser.full_name || '',
      bio: selectedUser.bio || '',
      avatar_url: selectedUser.avatar_url || '',
      website: selectedUser.website || '',
      account_type: selectedUser.account_type || 'personal',
      scuba_level: selectedUser.scuba_level || '',
      freediving_level: selectedUser.freediving_level || '',
      role: selectedUser.role || 'user',
      is_blocked: !!selectedUser.is_blocked,
      email_verified: !!selectedUser.email_verified,
    });
  }, [selectedUser]);

  const saveEditForm = async () => {
    if (!selectedUser || !editForm) return;
    const payload = {
      username: editForm.username,
      email: editForm.email,
      full_name: editForm.full_name,
      bio: editForm.bio,
      avatar_url: editForm.avatar_url,
      website: editForm.website,
      account_type: editForm.account_type,
      scuba_level: editForm.scuba_level,
      freediving_level: editForm.freediving_level,
      role: editForm.role,
      is_blocked: editForm.is_blocked,
      email_verified: editForm.email_verified,
    };
    await updateUser?.(selectedUser.id, payload);
  };

  return (
    <div className="card users-card-wrap">
      <div className="users-heading">
        <div>
          <h2>사용자 관리</h2>
          <p>사진, 가입일, 가입방식, 인증 상태, 다이빙 레벨을 한 화면에서 바로 볼 수 있어.</p>
        </div>
        <div className="users-summary">
          <div className="mini-stat"><span>전체</span><strong>{roleCounts.all ?? users.length}</strong></div>
          <div className="mini-stat"><span>일반</span><strong>{roleCounts.general ?? 0}</strong></div>
          <div className="mini-stat"><span>리조트</span><strong>{roleCounts.resort ?? 0}</strong></div>
          <div className="mini-stat"><span>관리자</span><strong>{roleCounts.admin ?? 0}</strong></div>
        </div>
      </div>

      <div className="users-summary users-summary--secondary">
        <div className="mini-stat"><span>정상</span><strong>{userSummary.active}</strong></div>
        <div className="mini-stat"><span>차단</span><strong>{userSummary.blocked}</strong></div>
        <div className="mini-stat"><span>인증</span><strong>{userSummary.verified}</strong></div>
        <div className="mini-stat"><span>SNS</span><strong>{(userSummary.google || 0) + (userSummary.apple || 0) + (userSummary.kakao || 0) + (userSummary.facebook || 0)}</strong></div>
      </div>

      <div className="row role-filter-row" style={{ marginBottom: 6 }}>
        {[
          ['all', '전체'],
          ['general', '일반'],
          ['resort', '리조트'],
          ['admin', '관리자'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={roleFilter === key ? 'chip active' : 'chip'}
            onClick={() => {
              setRoleFilter?.(key);
              refresh?.({ memberRole: key });
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="row users-search-row" style={{ marginBottom: 10 }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="email / username / 이름 검색" />
        <button type="button" onClick={refresh}>검색</button>
      </div>

      <div className="row users-mini-filter-row" style={{ marginBottom: 12 }}>
        {[
          ['all', '전체 상태'],
          ['active', '정상'],
          ['blocked', '차단'],
          ['verified', '인증됨'],
          ['unverified', '미인증'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={statusFilter === key ? 'chip active' : 'chip'}
            onClick={() => setStatusFilter(key)}
          >
            {label}
          </button>
        ))}
        <span className="mini-filter-spacer" />
        {[
          ['all', '전체 연동'],
          ['email', '이메일'],
          ['google', 'Google'],
          ['apple', 'Apple'],
          ['kakao', 'Kakao'],
          ['facebook', 'Facebook'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={authFilter === key ? 'chip active' : 'chip'}
            onClick={() => setAuthFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {selectedUser && (
        <div className="users-detail-panel">
          <div className="users-detail-head">
            <div className="user-head">
              <div className="user-avatar user-avatar--detail">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.username} />
                ) : (
                  <span>{(selectedUser.username || '?')[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <h3>{selectedUser.full_name || selectedUser.username || '-'}</h3>
                <p>{selectedUser.email || '-'}</p>
                <div className="user-meta user-meta--stack">
                  <span>ID: {selectedUser.id}</span>
                  <span>가입방식: {formatAuthMethod(selectedUser)}</span>
                  <span>가입일: {formatDate(selectedUser.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="users-detail-badges">
              <span className={`badge ${selectedUser.role === 'admin' ? 'admin' : 'user'}`}>{selectedUser.role}</span>
              <span className={`badge ${selectedUser.is_blocked ? 'blocked' : 'active'}`}>{selectedUser.is_blocked ? '차단' : '정상'}</span>
              <span className={`badge ${selectedUser.email_verified ? 'active' : 'blocked'}`}>{selectedUser.email_verified ? '이메일 인증' : '미인증'}</span>
            </div>
          </div>
          <div className="users-detail-grid">
            <div className="detail-box">
              <span>계정형태</span>
              <select value={editForm?.account_type || 'personal'} onChange={(e) => setEditForm((prev) => ({ ...prev, account_type: e.target.value }))}>
                <option value="personal">personal</option>
                <option value="resort">resort</option>
              </select>
            </div>
            <div className="detail-box">
              <span>스쿠버</span>
              <input value={editForm?.scuba_level || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, scuba_level: e.target.value }))} placeholder="스쿠버 레벨" />
            </div>
            <div className="detail-box">
              <span>프리다이빙</span>
              <input value={editForm?.freediving_level || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, freediving_level: e.target.value }))} placeholder="프리다이빙 레벨" />
            </div>
            <div className="detail-box">
              <span>게시물 수</span>
              <strong>{selectedUser.post_count ?? 0}</strong>
            </div>
          </div>
          <div className="users-detail-auth">
            <span>연동 수단</span>
            <div className="users-detail-auth-list">
              {selectedAuthMethods.map((method) => (
                <span key={method} className="detail-pill">{method}</span>
              ))}
            </div>
          </div>
          <div className="users-edit-grid">
            <label className="detail-box">
              <span>닉네임</span>
              <input value={editForm?.username || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))} />
            </label>
            <label className="detail-box">
              <span>이메일</span>
              <input value={editForm?.email || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))} />
            </label>
            <label className="detail-box">
              <span>이름</span>
              <input value={editForm?.full_name || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, full_name: e.target.value }))} />
            </label>
            <label className="detail-box">
              <span>프로필 이미지</span>
              <input value={editForm?.avatar_url || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, avatar_url: e.target.value }))} placeholder="이미지 URL" />
            </label>
            <label className="detail-box detail-box--wide">
              <span>자기소개</span>
              <textarea rows={3} value={editForm?.bio || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))} />
            </label>
            <label className="detail-box">
              <span>웹사이트</span>
              <input value={editForm?.website || ''} onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://..." />
            </label>
            <label className="detail-box">
              <span>역할</span>
              <select value={editForm?.role || 'user'} onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="user">user</option>
                <option value="resort">resort</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="detail-box detail-box--toggle">
              <span>차단</span>
              <input type="checkbox" checked={!!editForm?.is_blocked} onChange={(e) => setEditForm((prev) => ({ ...prev, is_blocked: e.target.checked }))} />
            </label>
            <label className="detail-box detail-box--toggle">
              <span>이메일 인증</span>
              <input type="checkbox" checked={!!editForm?.email_verified} onChange={(e) => setEditForm((prev) => ({ ...prev, email_verified: e.target.checked }))} />
            </label>
          </div>
          <div className="actions users-detail-actions">
            <button type="button" className="sm" onClick={saveEditForm}>수정 반영</button>
            <button type="button" className="sm" onClick={() => setEditForm({
              username: selectedUser.username || '',
              email: selectedUser.email || '',
              full_name: selectedUser.full_name || '',
              bio: selectedUser.bio || '',
              avatar_url: selectedUser.avatar_url || '',
              website: selectedUser.website || '',
              account_type: selectedUser.account_type || 'personal',
              scuba_level: selectedUser.scuba_level || '',
              freediving_level: selectedUser.freediving_level || '',
              role: selectedUser.role || 'user',
              is_blocked: !!selectedUser.is_blocked,
              email_verified: !!selectedUser.email_verified,
            })}>
              원본 복원
            </button>
            <button type="button" className="sm danger" onClick={() => deleteUserPosts?.(selectedUser.id)} title="이 회원의 게시물만 모두 삭제">
              게시물 전체 삭제
            </button>
            <button type="button" className="sm danger" onClick={() => deleteUser?.(selectedUser.id)} title="이 회원과 게시물을 모두 삭제">
              회원 삭제
            </button>
          </div>
        </div>
      )}

      {visibleUsers.length === 0 ? (
        <p className="users-empty">사용자 데이터가 없습니다.</p>
      ) : (
        <div className="users-table-scroll">
          <table className="users-table">
            <thead>
              <tr>
                <th>사진</th>
                <th>회원</th>
                <th>가입일</th>
                <th>가입방식</th>
                <th>다이빙 레벨</th>
                <th>상태</th>
                <th>활동</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => (
                <tr
                  key={user.id}
                  className={String(selectedUser?.id) === String(user.id) ? 'selected' : ''}
                  onClick={() => setSelectedUserId(String(user.id))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedUserId(String(user.id));
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <td>
                    <div className="user-avatar user-avatar--table">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} />
                      ) : (
                        <span>{(user.username || '?')[0]?.toUpperCase()}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="user-name">{user.full_name || user.username}</div>
                    <div className="user-email">{user.email}</div>
                    <div className="user-meta user-meta--stack">
                      <span>ID: {user.id}</span>
                      <span>계정형태: {user.account_type || 'personal'}</span>
                      <span>연동: {formatAuthMethod(user)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="user-meta-block">{formatDate(user.created_at)}</div>
                  </td>
                  <td>
                    <div className="user-meta-block">{formatAuthMethod(user)}</div>
                    {user.email_verified ? (
                      <span className="badge active">이메일 인증</span>
                    ) : (
                      <span className="badge blocked">미인증</span>
                    )}
                  </td>
                  <td>
                    <div className="level-stack">
                      <span>스쿠버: {user.scuba_level || '-'}</span>
                      <span>프리다이빙: {user.freediving_level || '-'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="user-badges user-badges--stack">
                      <span className={`badge ${user.role === 'admin' ? 'admin' : 'user'}`}>{user.role}</span>
                      <span className={`badge ${user.is_blocked ? 'blocked' : 'active'}`}>{user.is_blocked ? '차단' : '정상'}</span>
                      <span className={`badge ${user.email_verified ? 'active' : 'blocked'}`}>{user.email_verified ? '이메일 인증' : '미인증'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="user-meta-block">게시물 {user.post_count ?? 0}개</div>
                  </td>
                  <td>
                    <UserCardActions
                      user={user}
                      updateUser={updateUser}
                      deleteUserPosts={deleteUserPosts}
                      deleteUser={deleteUser}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
