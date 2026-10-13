import { useEffect, useMemo, useState } from 'react';

export function usePagination(items = [], initialPageSize = 12, resetKey = '') {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items, pageSize]);

  useEffect(() => { setPage(1); }, [resetKey]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  return { page: currentPage, setPage, pageSize, setPageSize, total, totalPages, pageItems };
}

export default function Pagination({ page, setPage, pageSize, setPageSize, total, totalPages, label = '항목', pageSizeOptions = [10, 20, 50] }) {
  if (!total) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
    const first = Math.max(1, Math.min(page - 2, totalPages - 4));
    return first + index;
  });

  return (
    <nav className={`admin-pagination ${totalPages === 1 ? 'is-single-page' : ''}`} aria-label={`${label} 페이지 이동`}>
      <div className="admin-pagination-summary"><strong>{start}-{end}</strong><span>/ 총 {total.toLocaleString('ko-KR')}개</span></div>
      {totalPages > 1 && <div className="admin-pagination-controls">
        {totalPages > 5 && <button type="button" className="pagination-edge" onClick={() => setPage(1)} disabled={page === 1} aria-label="첫 페이지">처음</button>}
        <button type="button" className="pagination-direction" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} aria-label="이전 페이지"><span aria-hidden>‹</span> 이전</button>
        {pages.map((value) => <button type="button" key={value} className={value === page ? 'is-active pagination-number' : 'pagination-number'} onClick={() => setPage(value)} aria-current={value === page ? 'page' : undefined}>{value}</button>)}
        <button type="button" className="pagination-direction" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="다음 페이지">다음 <span aria-hidden>›</span></button>
        {totalPages > 5 && <button type="button" className="pagination-edge" onClick={() => setPage(totalPages)} disabled={page === totalPages} aria-label="마지막 페이지">마지막</button>}
      </div>}
      {totalPages === 1 && <div className="admin-pagination-page-status">전체 항목을 한 페이지에 표시 중</div>}
      <label className="admin-pagination-size"><span>페이지당</span><select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{pageSizeOptions.map((size) => <option key={size} value={size}>{size}개</option>)}</select></label>
    </nav>
  );
}
