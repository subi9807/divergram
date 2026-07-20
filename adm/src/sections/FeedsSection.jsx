function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return String(value);
  }
}

function FeedCard({ post, onDelete }) {
  return (
    <article className="post-card feed-card">
      <div className="post-card-media">
        {post.image_url ? <img src={post.image_url} alt="feed thumb" /> : <div className="post-card-empty">NO IMAGE</div>}
      </div>
      <div className="post-card-overlay">
        <div className="post-card-overlay-inner">
          <div className="post-card-top">
            <span className="post-badge">FEED</span>
            <button type="button" className="sm danger post-delete-btn" onClick={() => onDelete?.(post.id)}>삭제</button>
          </div>
          <div className="post-card-meta">
            <strong>{post.caption || '캡션 없음'}</strong>
            <p>{post.location || '위치 없음'}</p>
            <span>ID: {post.id}</span>
            <span>USER: {post.user_id || '-'}</span>
            <span>{formatDate(post.created_at)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function FeedsSection({ feedRows, feedPageRows, feedPage, feedTotalPages, setFeedPage, onDelete }) {
  return (
    <div className="card admin-section">
      <div className="section-head">
        <div>
          <h2>피드 관리</h2>
          <p>카드에 마우스를 올리면 상세 정보가 보이도록 정리했어. ({feedRows.length}건)</p>
        </div>
        <span className="badge active">삭제 가능</span>
      </div>

      <div className="post-grid">
        {feedPageRows.map((post) => <FeedCard key={post.id} post={post} onDelete={onDelete} />)}
      </div>

      <div className="row post-pagination">
        <span className="post-page-label">페이지 {feedPage} / {feedTotalPages}</span>
        <div className="row">
          <button type="button" onClick={() => setFeedPage((page) => Math.max(1, page - 1))} disabled={feedPage <= 1}>이전</button>
          <button type="button" onClick={() => setFeedPage((page) => Math.min(feedTotalPages, page + 1))} disabled={feedPage >= feedTotalPages}>다음</button>
        </div>
      </div>
    </div>
  );
}
