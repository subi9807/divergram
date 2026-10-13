import { useMemo, useState } from 'react';
import Pagination, { usePagination } from '../components/Pagination';

function formatDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR');
}

function detailText(value) {
  if (!value) return '-';
  try {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2);
  } catch {
    return String(value);
  }
}

function escapeCsv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function LogsSection({ logs = [] }) {
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const actions = useMemo(() => [...new Set(logs.map((item) => item.action).filter(Boolean))].sort(), [logs]);
  const visibleLogs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((item) => {
      if (actionFilter !== 'all' && item.action !== actionFilter) return false;
      if (!needle) return true;
      return [item.action, item.target_user_id, item.admin_user_id, detailText(item.detail)].join(' ').toLowerCase().includes(needle);
    });
  }, [actionFilter, logs, query]);
  const pagination = usePagination(visibleLogs, 20, `${query}:${actionFilter}`);
  const selected = logs.find((item) => item.id === selectedId) || null;

  const exportCsv = () => {
    const rows = [['시간', '작업', '관리자', '대상 회원', '상세'], ...visibleLogs.map((item) => [formatDate(item.created_at), item.action, item.admin_user_id || '', item.target_user_id || '', detailText(item.detail)])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `divergram-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-section audit-section">
      <section className="operation-page-head">
        <div><p className="section-kicker">SECURITY & COMPLIANCE</p><h2>감사 로그</h2><p>관리자 작업과 주요 데이터 변경 이력을 검색하고 검토합니다.</p></div>
        <div className="operation-head-actions"><span>전체 <strong>{logs.length}</strong></span><span>필터 결과 <strong>{visibleLogs.length}</strong></span><button type="button" onClick={exportCsv} disabled={!visibleLogs.length}>CSV 내보내기</button></div>
      </section>
      <section className="card audit-workspace">
        <div className="operation-toolbar">
          <label className="operation-search"><span aria-hidden>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="작업, 관리자, 대상 회원, 상세 내용 검색" /></label>
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} aria-label="작업 필터"><option value="all">모든 작업</option>{actions.map((action) => <option key={action} value={action}>{action}</option>)}</select>
          <button type="button" className="ghost" onClick={() => { setQuery(''); setActionFilter('all'); }}>필터 초기화</button>
        </div>
        <div className="audit-table-wrap">
          <table className="audit-table"><thead><tr><th>시간</th><th>작업</th><th>관리자</th><th>대상 회원</th><th>상세</th></tr></thead><tbody>{pagination.pageItems.map((item) => <tr key={item.id} className={selectedId === item.id ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)}><td>{formatDate(item.created_at)}</td><td><span className="audit-action">{item.action || '-'}</span></td><td>{item.admin_user_id || '-'}</td><td>{item.target_user_id || '-'}</td><td><button type="button" className="ghost sm" onClick={() => setSelectedId(item.id)}>상세 보기</button></td></tr>)}</tbody></table>
          {!visibleLogs.length && <div className="operation-empty"><strong>조건에 맞는 감사 로그가 없습니다.</strong><span>검색어나 작업 필터를 변경해 주세요.</span></div>}
        </div>
        <Pagination {...pagination} label="감사 로그" />
      </section>
      {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedId('')}><div className="modal-panel audit-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><h3>감사 로그 상세</h3><p>{formatDate(selected.created_at)}</p></div><button type="button" className="ghost" onClick={() => setSelectedId('')}>닫기</button></div><div className="audit-detail-grid"><div><span>작업</span><strong>{selected.action || '-'}</strong></div><div><span>관리자</span><strong>{selected.admin_user_id || '-'}</strong></div><div><span>대상 회원</span><strong>{selected.target_user_id || '-'}</strong></div><div><span>로그 ID</span><strong>{selected.id}</strong></div></div><pre className="audit-detail-code">{detailText(selected.detail)}</pre></div></div>}
    </div>
  );
}
