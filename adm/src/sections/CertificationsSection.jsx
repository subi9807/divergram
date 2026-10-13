import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import Pagination, { usePagination } from '../components/Pagination';

const STATUS_FILTERS = [
  ['all', '전체'],
  ['reviewing', '검토 대기'],
  ['verified', '인증 완료'],
  ['rejected', '반려'],
  ['unregistered', '미등록'],
];

const STATUS_LABELS = {
  reviewing: '검토 대기',
  verified: '인증 완료',
  rejected: '반려',
  unregistered: '미등록',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('ko-KR');
}

function statusClass(status) {
  if (status === 'verified') return 'cert-status is-verified';
  if (status === 'rejected') return 'cert-status is-rejected';
  return 'cert-status is-reviewing';
}

export default function CertificationsSection({ certifications = [], refresh }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const counts = useMemo(() => certifications.reduce((result, item) => {
    const status = String(item?.status || 'reviewing').toLowerCase();
    result.all += 1;
    result[status] = (result[status] || 0) + 1;
    return result;
  }, { all: 0, reviewing: 0, verified: 0, rejected: 0, unregistered: 0 }), [certifications]);

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return certifications.filter((item) => {
      const status = String(item?.status || 'reviewing').toLowerCase();
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!needle) return true;
      return [item.agency, item.certification_number, item.level, item.user_id]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [certifications, query, statusFilter]);
  const pagination = usePagination(visibleItems, 12, `${query}:${statusFilter}`);

  const updateStatus = async (item, status) => {
    if (!item?.id || busyId) return;
    const action = status === 'verified' ? '승인' : status === 'rejected' ? '반려' : '재검토';
    if (!window.confirm(`${item.agency || '라이선스'} 인증을 ${action} 처리할까요?`)) return;
    setBusyId(item.id);
    setMessage('');
    setError('');
    try {
      await api(`/api/admin/certifications/${encodeURIComponent(item.id)}/status`, {
        method: 'PATCH',
        body: { status },
      });
      setMessage(`${item.certification_number || item.id} 인증이 ${action} 처리되었습니다.`);
      await refresh();
    } catch (updateError) {
      setError(updateError.message || '라이선스 상태를 변경하지 못했습니다.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-section certification-section">
      <section className="certification-overview">
        <div>
          <p className="section-kicker">MEMBER TRUST</p>
          <h2>라이선스 인증 심사</h2>
          <p>회원이 제출한 다이빙 자격 증빙을 확인하고 승인·반려 상태를 관리합니다.</p>
        </div>
        <div className="certification-summary">
          <div><span>검토 대기</span><strong>{counts.reviewing + counts.unregistered}</strong></div>
          <div><span>인증 완료</span><strong>{counts.verified}</strong></div>
          <div><span>반려</span><strong>{counts.rejected}</strong></div>
          <div><span>전체</span><strong>{counts.all}</strong></div>
        </div>
      </section>

      <section className="card certification-workspace">
        <div className="certification-toolbar">
          <div className="certification-tabs" role="tablist" aria-label="인증 상태 필터">
            {STATUS_FILTERS.map(([key, label]) => (
              <button key={key} type="button" className={statusFilter === key ? 'chip active' : 'chip'} onClick={() => setStatusFilter(key)}>
                {label}<span>{counts[key] || 0}</span>
              </button>
            ))}
          </div>
          <label className="certification-search">
            <span aria-hidden>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="기관, 라이선스 번호, 등급, 회원 ID 검색" />
          </label>
        </div>

        {message && <p className="certification-message is-success">{message}</p>}
        {error && <p className="certification-message is-error">{error}</p>}

        <div className="certification-list">
          {pagination.pageItems.map((item) => {
            const status = String(item.status || 'reviewing').toLowerCase();
            const selected = selectedId === item.id;
            return (
              <article className={`certification-card ${selected ? 'is-selected' : ''}`} key={item.id}>
                <button className="certification-main" type="button" onClick={() => setSelectedId(selected ? '' : item.id)}>
                  <div className="certification-thumb">
                    {item.image_url ? <img src={item.image_url} alt="라이선스 증빙" /> : <span aria-hidden>LIC</span>}
                  </div>
                  <div className="certification-identity">
                    <div><span className={statusClass(status)}>{STATUS_LABELS[status] || status}</span><small>{item.agency || '발급 기관 미입력'}</small></div>
                    <h3>{item.level || '등급 미입력'}</h3>
                    <p>{item.certification_number || '라이선스 번호 없음'}</p>
                  </div>
                  <div className="certification-meta">
                    <span>회원 ID<strong>{item.user_id || '-'}</strong></span>
                    <span>발급일<strong>{formatDate(item.issued_at)}</strong></span>
                    <span>만료일<strong>{formatDate(item.expires_at)}</strong></span>
                  </div>
                  <span className="certification-expand" aria-hidden>{selected ? '−' : '+'}</span>
                </button>

                {selected && (
                  <div className="certification-detail">
                    <div className="certification-proof">
                      {item.image_url ? (
                        <a href={item.image_url} target="_blank" rel="noreferrer"><img src={item.image_url} alt="제출된 라이선스 원본" /><span>원본 이미지 열기 ↗</span></a>
                      ) : <p>제출된 증빙 이미지가 없습니다. 이미지 확인 후 승인하는 것을 권장합니다.</p>}
                    </div>
                    <div className="certification-detail-copy">
                      <p className="section-kicker">REVIEW CHECKLIST</p>
                      <h4>심사 체크리스트</h4>
                      <ul>
                        <li>회원 이름과 제출 증빙의 이름이 일치하는지 확인</li>
                        <li>발급 기관·자격 번호·등급이 선명한지 확인</li>
                        <li>만료일이 있는 자격이라면 현재 유효한지 확인</li>
                      </ul>
                      <div className="certification-actions">
                        {status !== 'verified' && <button type="button" disabled={busyId === item.id} onClick={() => updateStatus(item, 'verified')}>인증 승인</button>}
                        {status !== 'rejected' && <button className="danger" type="button" disabled={busyId === item.id} onClick={() => updateStatus(item, 'rejected')}>반려 처리</button>}
                        {status !== 'reviewing' && <button className="ghost" type="button" disabled={busyId === item.id} onClick={() => updateStatus(item, 'reviewing')}>재검토로 변경</button>}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
          {!visibleItems.length && <div className="certification-empty"><strong>조건에 맞는 인증 요청이 없습니다.</strong><span>필터를 변경하거나 다른 검색어를 입력해 주세요.</span></div>}
        </div>
        <Pagination {...pagination} label="라이선스 인증" />
      </section>
    </div>
  );
}
