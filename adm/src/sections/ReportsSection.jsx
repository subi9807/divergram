import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const STATUS_TABS = [
  ['all', '전체'],
  ['open', '접수'],
  ['received', '수신'],
  ['reviewing', '검토'],
  ['resolved', '처리'],
  ['rejected', '반려'],
];

const TARGET_TABS = [
  ['all', '전체'],
  ['post', '피드'],
  ['reel', '릴스'],
  ['user', '회원'],
  ['comment', '덧글'],
  ['dive_log', '로그'],
];

function badgeClass(status = '') {
  const value = String(status).toLowerCase();
  if (['resolved', 'verified', 'active', 'ready'].includes(value)) return 'badge active';
  if (['rejected', 'blocked'].includes(value)) return 'badge blocked';
  return 'badge';
}

function prettyJson(value) {
  if (!value) return '-';
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2);
  } catch {
    return String(value);
  }
}

function parseDetail(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export default function ReportsSection({ reports = [], adminKey, refresh, reportBreakdown = {} }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [actions, setActions] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const detailSummary = useMemo(() => parseDetail(detail?.detail), [detail]);
  const pageSize = 10;

  const filteredReports = useMemo(() => (reports || []).filter((item) => {
    const status = String(item?.status || 'open').toLowerCase();
    const target = String(item?.target_type || 'post').toLowerCase();
    const haystack = [
      item?.reason,
      item?.user_username,
      item?.user_email,
      item?.target_id,
      item?.resolution_note,
      item?.detail ? prettyJson(item.detail) : '',
    ].join(' ').toLowerCase();
    const searchPass = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const statusPass = statusFilter === 'all' || status === statusFilter;
    const targetPass = targetFilter === 'all' || target === targetFilter;
    return statusPass && targetPass && searchPass;
  }), [reports, statusFilter, targetFilter, search]);
  const pageCount = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage]);
  const pageWindow = useMemo(() => {
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(pageCount, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const items = [];
    for (let i = start; i <= end; i += 1) items.push(i);
    return items;
  }, [currentPage, pageCount]);

  const loadDetail = async (reportId, { openModal = detailModalOpen } = {}) => {
    if (!reportId) return;
    setBusy(true);
    setError('');
    try {
      const response = await api(`/api/admin/reports/${reportId}`, { adminKey });
      setDetail(response.report || null);
      setActions(response.actions || []);
      setSelectedId(reportId);
      setNote('');
      setDetailModalOpen(openModal);
    } catch (e) {
      setError(e.message || '신고 상세 조회 실패');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, targetFilter, search]);

  useEffect(() => {
    if (!selectedId && pagedReports[0]?.id) {
      loadDetail(pagedReports[0].id);
    }
  }, [pagedReports, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    if (!filteredReports.some((item) => item.id === selectedId) && pagedReports[0]?.id) {
      loadDetail(pagedReports[0].id);
    }
  }, [filteredReports, pagedReports, selectedId]);

  const applyStatus = async (status) => {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/reports/${selectedId}/status`, {
        adminKey,
        method: 'PATCH',
        body: { status, note },
      });
      await refresh();
      await loadDetail(selectedId);
    } catch (e) {
      setError(e.message || '신고 상태 변경 실패');
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!selectedId || !note.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api(`/api/admin/reports/${selectedId}/actions`, {
        adminKey,
        method: 'POST',
        body: {
          action: 'note',
          note: note.trim(),
          targetType: detail?.target_type || 'report',
          targetId: detail?.target_id || selectedId,
          statusAfter: detail?.status || 'reviewing',
        },
      });
      await refresh();
      await loadDetail(selectedId);
    } catch (e) {
      setError(e.message || '메모 저장 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card admin-section">
      <div className="section-head">
        <div>
          <h2>신고 관리</h2>
          <p>접수부터 처리 이력까지 한 화면에서 운영할 수 있게 정리했어.</p>
        </div>
        <div className="section-head-meta">
          <span className="badge">총 {reports.length}</span>
          <span className="badge">접수 {reportBreakdown.open || 0}</span>
          <span className="badge">수신 {reportBreakdown.received || 0}</span>
          <span className="badge active">검토 {reportBreakdown.reviewing || 0}</span>
          <span className="badge">처리 {reportBreakdown.resolved || 0}</span>
          <span className="badge blocked">반려 {reportBreakdown.rejected || 0}</span>
        </div>
      </div>

      <div className="report-filters">
        <label className="report-filter-field">
          <span className="sr-only">상태</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="신고 상태">
            {STATUS_TABS.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <label className="report-filter-field">
          <span className="sr-only">대상</span>
          <select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)} aria-label="신고 대상">
            {TARGET_TABS.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <div className="row report-search-row">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="신고자/사유/대상 ID 검색" />
          <button type="button" onClick={() => setSearch('')}>초기화</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <strong>신고 목록</strong>
          <span className="muted">{filteredReports.length}건</span>
        </div>
        {filteredReports.length === 0 ? (
          <div className="empty-box">조건에 맞는 신고가 없어.</div>
        ) : (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>사유</th>
                  <th>신고자</th>
                  <th>대상</th>
                  <th>상태</th>
                  <th>시간</th>
                  <th>선택</th>
                </tr>
              </thead>
              <tbody>
                {pagedReports.map((item) => (
                  <tr key={item.id} className={selectedId === item.id ? 'active' : ''}>
                    <td>
                      <div className="report-table-title">
                        <strong>{item.reason || '사유 없음'}</strong>
                        <span>대상 ID {item.target_id || '-'}</span>
                      </div>
                    </td>
                    <td>{item.user_username || item.user_email || item.user_id || '-'}</td>
                    <td>{item.target_type || 'post'}</td>
                    <td><span className={badgeClass(item.status)}>{item.status || 'open'}</span></td>
                    <td>{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</td>
                    <td>
                      <button type="button" className="sm" onClick={() => loadDetail(item.id, { openModal: true })}>보기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredReports.length > pageSize && (
          <div className="report-pagination">
            <button type="button" className="ghost" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage <= 1}>
              이전
            </button>
            <div className="report-pagination-pages">
              {pageWindow.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === currentPage ? 'chip active' : 'chip'}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="button" className="ghost" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={currentPage >= pageCount}>
              다음
            </button>
            <span className="muted report-pagination-info">{currentPage} / {pageCount}</span>
          </div>
        )}
      </div>

      {detailModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDetailModalOpen(false)}>
          <div
            className="modal-panel reports-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label="신고 상세"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3>신고 상세</h3>
                <p>{busy ? '불러오는 중...' : selectedId || '미선택'}</p>
              </div>
              <button type="button" className="ghost" onClick={() => setDetailModalOpen(false)}>닫기</button>
            </div>

            {!detail ? (
              <div className="empty-box">신고 정보를 불러오는 중이거나 선택된 항목이 없어.</div>
            ) : (
              <>
                <div className="detail-hero">
                  <div className="detail-hero-main">
                    <div className="detail-hero-top">
                      <div>
                        <span>신고 사유</span>
                        <strong>{detail.reason || '-'}</strong>
                      </div>
                      <div className="detail-hero-badges">
                        <span className={badgeClass(detail.status)}>{detail.status || 'open'}</span>
                        <span className="badge">{detail.target_type || 'post'}</span>
                      </div>
                    </div>
                    <div className="detail-hero-meta">
                      <div><span>신고자</span><strong>{detail.user_username || detail.user_email || detail.user_id || '-'}</strong></div>
                      <div><span>대상 ID</span><strong>{detail.target_id || '-'}</strong></div>
                      <div><span>처리자</span><strong>{detail.handled_by || '-'}</strong></div>
                      <div><span>생성일</span><strong>{detail.created_at ? new Date(detail.created_at).toLocaleString() : '-'}</strong></div>
                    </div>
                  </div>
                </div>
                <div className="detail-card">
                  <span>신고 상세 정보</span>
                  <pre>{prettyJson(detail.detail)}</pre>
                </div>
                <div className="detail-card">
                  <span>대상 요약</span>
                  <div className="summary-grid">
                    <div><strong>제목</strong><p>{detailSummary.title || detailSummary.caption || detailSummary.reason || '-'}</p></div>
                    <div><strong>작성자</strong><p>{detailSummary.username || detailSummary.user_name || detailSummary.full_name || '-'}</p></div>
                    <div><strong>위치</strong><p>{detailSummary.location || detailSummary.region || detailSummary.resort_region || '-'}</p></div>
                    <div><strong>부가 정보</strong><p>{detailSummary.url || detailSummary.target_url || detailSummary.media_url || '-'}</p></div>
                  </div>
                </div>
                <div className="detail-card">
                  <span>해결 메모</span>
                  <p>{detail.resolution_note || '-'}</p>
                </div>
                <div className="detail-actions detail-actions--sticky">
                  <button type="button" onClick={() => applyStatus('received')} disabled={busy}>접수</button>
                  <button type="button" onClick={() => applyStatus('reviewing')} disabled={busy}>검토</button>
                  <button type="button" onClick={() => applyStatus('resolved')} disabled={busy}>처리</button>
                  <button type="button" className="danger" onClick={() => applyStatus('rejected')} disabled={busy}>반려</button>
                </div>
                <div className="detail-note">
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="메모 또는 처리 사유를 입력해줘." rows={4} />
                  <div className="row">
                    <button type="button" onClick={addNote} disabled={busy || !note.trim()}>메모 저장</button>
                    <button type="button" onClick={() => setNote('')} disabled={busy}>초기화</button>
                  </div>
                </div>
                <div className="detail-card">
                  <span>처리 이력</span>
                  <div className="history-list">
                    {actions.length === 0 ? <p className="muted">아직 이력이 없어.</p> : actions.map((action) => (
                      <div key={action.id} className="history-item">
                        <strong>{action.action}</strong>
                        <p>{action.note || '메모 없음'} · {action.status_after || '-'}</p>
                        <small>{action.created_at ? new Date(action.created_at).toLocaleString() : '-'}</small>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
