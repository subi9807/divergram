import { useEffect, useMemo, useState } from 'react';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR');
}

export default function ContentLibrary({
  type,
  rows = [],
  page,
  setPage,
  getThumbnail,
  onDelete,
  onBulkDelete,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [selected, setSelected] = useState(() => new Set());
  const pageSize = 12;
  const isReel = type === 'reel';
  const label = isReel ? '릴스' : '피드';

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const next = rows.filter((item) => {
      if (!needle) return true;
      return [item.caption, item.location, item.user_id, item.id]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    return [...next].sort((a, b) => {
      const left = new Date(a.created_at || 0).getTime();
      const right = new Date(b.created_at || 0).getTime();
      return sort === 'oldest' ? left - right : right - left;
    });
  }, [query, rows, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, setPage, totalPages]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [query, setPage, sort]);

  const toggleSelected = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectPage = () => {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = pageRows.length > 0 && pageRows.every((item) => next.has(item.id));
      pageRows.forEach((item) => (allSelected ? next.delete(item.id) : next.add(item.id)));
      return next;
    });
  };

  const removeSelected = async () => {
    if (!selected.size) return;
    await onBulkDelete?.([...selected]);
    setSelected(new Set());
  };

  return (
    <div className="admin-section content-library">
      <section className="content-library-head">
        <div>
          <p className="section-kicker">CONTENT OPERATIONS</p>
          <h2>{label} 콘텐츠 관리</h2>
          <p>{label} 콘텐츠를 검색하고 검수하며 필요한 항목을 일괄 처리합니다.</p>
        </div>
        <div className="content-library-stats">
          <span>전체<strong>{rows.length}</strong></span>
          <span>검색 결과<strong>{filtered.length}</strong></span>
          <span>선택<strong>{selected.size}</strong></span>
        </div>
      </section>

      <section className="card content-library-panel">
        <div className="content-library-toolbar">
          <label className="operation-search"><span aria-hidden>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="캡션, 위치, 회원 ID, 콘텐츠 ID 검색" /></label>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬 순서">
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
          <button type="button" className="ghost" onClick={selectPage}>{pageRows.every((item) => selected.has(item.id)) && pageRows.length ? '현재 페이지 해제' : '현재 페이지 선택'}</button>
          <button type="button" className="danger" onClick={removeSelected} disabled={!selected.size}>선택 삭제 {selected.size || ''}</button>
        </div>

        <div className="post-grid content-library-grid">
          {pageRows.map((post) => {
            const thumb = getThumbnail?.(post) || post.image_url || '';
            const checked = selected.has(post.id);
            return (
              <article className={`post-card ${isReel ? 'reel-card' : 'feed-card'} ${checked ? 'is-selected' : ''}`} key={post.id}>
                <div className="post-card-media">{thumb ? <img src={thumb} alt="콘텐츠 미리보기" /> : <div className="post-card-empty">MEDIA 없음</div>}</div>
                <label className="post-select" title="콘텐츠 선택"><input type="checkbox" checked={checked} onChange={() => toggleSelected(post.id)} /><span /></label>
                <div className="post-type-chip">{isReel ? '▶ REEL' : 'FEED'}</div>
                <div className="post-card-overlay">
                  <div className="post-card-overlay-inner">
                    <div className="post-card-top"><span>{formatDate(post.created_at)}</span><button type="button" className="sm danger post-delete-btn" onClick={() => onDelete?.(post.id)}>삭제</button></div>
                    <div className="post-card-meta">
                      <strong>{post.caption || '캡션 없음'}</strong>
                      <p>{post.location || (isReel ? post.video_url : '') || '추가 정보 없음'}</p>
                      <span>회원 {post.user_id || '-'}</span><span>ID {post.id}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!pageRows.length && <div className="operation-empty"><strong>표시할 {label}가 없습니다.</strong><span>검색 조건을 변경해 주세요.</span></div>}

        <div className="operation-pagination">
          <span>{filtered.length}건 · {currentPage}/{totalPages} 페이지</span>
          <div><button type="button" className="ghost" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage <= 1}>이전</button><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages}>다음</button></div>
        </div>
      </section>
    </div>
  );
}
