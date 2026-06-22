import { useEffect, useMemo, useState } from 'react';

function FeedRow({ post, onDelete, checked, onToggleSelect }) {
  return (
    <tr>
      <td className="table-select-cell">
        <label className="table-check">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleSelect?.(post.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`피드 ${post.id} 선택`}
          />
        </label>
      </td>
      <td>
        {post.image_url ? (
          <img src={post.image_url} alt="thumb" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <span style={{ color: '#9ca3af' }}>-</span>
        )}
      </td>
      <td>{post.id}</td>
      <td>{post.user_id}</td>
      <td>{post.caption || '-'}</td>
      <td>{post.location || '-'}</td>
      <td>{post.created_at ? new Date(post.created_at).toLocaleString() : '-'}</td>
      <td>
        <button type="button" className="sm danger" onClick={() => onDelete?.(post.id)}>삭제</button>
      </td>
    </tr>
  );
}

export default function FeedsSection({ feedRows, feedPageRows, feedPage, feedTotalPages, setFeedPage, onDelete, onBulkDelete }) {
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const allowed = new Set((feedRows || []).map((item) => String(item?.id || '').trim()).filter(Boolean));
    setSelectedIds((prev) => prev.filter((id) => allowed.has(String(id))));
  }, [feedRows]);

  const pageIds = useMemo(() => (feedPageRows || []).map((item) => String(item?.id || '').trim()).filter(Boolean), [feedPageRows]);
  const selectedCount = selectedIds.length;
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (id) => {
    const targetId = String(id || '').trim();
    if (!targetId) return;
    setSelectedIds((prev) => prev.includes(targetId) ? prev.filter((item) => item !== targetId) : [...prev, targetId]);
  };

  const togglePageSelect = () => {
    if (!pageIds.length) return;
    setSelectedIds((prev) => {
      if (pageAllSelected) return prev.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...prev, ...pageIds]));
    });
  };

  const bulkDeleteSelected = async () => {
    if (!selectedIds.length) return;
    await onBulkDelete?.(selectedIds);
    setSelectedIds([]);
  };

  return (
    <div className="card admin-section">
      <div className="section-head">
        <div>
          <h2>피드 관리</h2>
          <p>이미지 기반 피드 게시물 목록 ({feedRows.length}건)</p>
        </div>
        <div className="section-head-meta">
          <span className="badge active">삭제 가능</span>
          <button type="button" className="sm danger" onClick={bulkDeleteSelected} disabled={!selectedCount}>선택 삭제{selectedCount ? ` (${selectedCount})` : ''}</button>
        </div>
      </div>
      <div className="table-toolbar">
        <label className="table-select-all">
          <input type="checkbox" checked={pageAllSelected} onChange={togglePageSelect} />
          <span>현재 페이지 전체 선택</span>
        </label>
        <span className="table-selection-count">선택 {selectedCount}개</span>
      </div>
      <table>
        <thead>
          <tr>
            <th className="table-select-cell">선택</th>
            <th>THUMB</th>
            <th>ID</th>
            <th>USER</th>
            <th>CAPTION</th>
            <th>LOCATION</th>
            <th>CREATED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>{feedPageRows.map((post) => <FeedRow key={post.id} post={post} checked={selectedIds.includes(String(post.id))} onToggleSelect={toggleSelect} onDelete={onDelete} />)}</tbody>
      </table>
      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <span style={{ color: '#6b7280', fontSize: 13 }}>페이지 {feedPage} / {feedTotalPages}</span>
        <div className="row">
          <button type="button" onClick={() => setFeedPage((page) => Math.max(1, page - 1))} disabled={feedPage <= 1}>이전</button>
          <button type="button" onClick={() => setFeedPage((page) => Math.min(feedTotalPages, page + 1))} disabled={feedPage >= feedTotalPages}>다음</button>
        </div>
      </div>
    </div>
  );
}
