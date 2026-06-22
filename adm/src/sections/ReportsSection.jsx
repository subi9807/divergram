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
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [actions, setActions] = useState([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const detailSummary = useMemo(() => parseDetail(detail?.detail), [detail]);

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

  const loadDetail = async (reportId) => {
    if (!reportId) return;
    setBusy(true);
    setError('');
    try {
      const response = await api(`/api/admin/reports/${reportId}`, { adminKey });
      setDetail(response.report || null);
      setActions(response.actions || []);
      setSelectedId(reportId);
      setNote('');
    } catch (e) {
      setError(e.message || '신고 상세 조회 실패');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!selectedId && filteredReports[0]?.id) {
      loadDetail(filteredReports[0].id);
    }
  }, [filteredReports, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    if (!filteredReports.some((item) => item.id === selectedId) && filteredReports[0]?.id) {
      loadDetail(filteredReports[0].id);
    }
  }, [filteredReports, selectedId]);

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
          <span className="badge active">검토 {reportBreakdown.reviewing || 0}</span>
          <span className="badge blocked">반려 {reportBreakdown.rejected || 0}</span>
        </div>
      </div>

      <div className="toolbar">
        <div className="chip-group">
          {STATUS_TABS.map(([key, label]) => (
            <button key={key} type="button" className={statusFilter === key ? 'chip active' : 'chip'} onClick={() => setStatusFilter(key)}>{label}</button>
          ))}
        </div>
        <div className="chip-group">
          {TARGET_TABS.map(([key, label]) => (
            <button key={key} type="button" className={targetFilter === key ? 'chip active' : 'chip'} onClick={() => setTargetFilter(key)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="신고자/사유/대상 ID 검색" />
        <button type="button" onClick={() => setSearch('')}>초기화</button>
      </div>

      <div className="split-grid">
        <div className="panel">
          <div className="panel-head">
            <strong>신고 목록</strong>
            <span className="muted">{filteredReports.length}건</span>
          </div>
          <div className="report-list">
            {filteredReports.length === 0 ? (
              <div className="empty-box">조건에 맞는 신고가 없어.</div>
            ) : filteredReports.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selectedId === item.id ? 'report-item active' : 'report-item'}
                onClick={() => loadDetail(item.id)}
              >
                <div className="report-item-top">
                  <strong>{item.reason || '사유 없음'}</strong>
                  <span className={badgeClass(item.status)}>{item.status || 'open'}</span>
                </div>
                <p>{item.user_username || item.user_email || item.user_id || '-'} · {item.target_type || 'post'} · {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</p>
                <small>대상: {item.target_id || '-'}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="panel detail-panel">
          <div className="panel-head">
            <strong>신고 상세</strong>
            <span className="muted">{busy ? '불러오는 중...' : selectedId || '미선택'}</span>
          </div>
          {!detail ? (
            <div className="empty-box">목록에서 신고를 선택하면 상세 정보와 처리 이력이 보여져.</div>
          ) : (
            <>
              <div className="detail-stack">
                <div><span>신고자</span><strong>{detail.user_username || detail.user_email || detail.user_id || '-'}</strong></div>
                <div><span>대상 유형</span><strong>{detail.target_type || 'post'}</strong></div>
                <div><span>대상 ID</span><strong>{detail.target_id || '-'}</strong></div>
                <div><span>처리자</span><strong>{detail.handled_by || '-'}</strong></div>
              </div>
              <div className="detail-card">
                <span>신고 사유</span>
                <strong>{detail.reason || '-'}</strong>
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
              <div className="detail-actions">
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
    </div>
  );
}
