function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return String(value);
  }
}

function ReelCard({ post, onDelete, getReelThumb }) {
  const thumb = getReelThumb?.(post);
  return (
    <article className="post-card reel-card">
      <div className="post-card-media">
        {thumb ? <img src={thumb} alt="reel thumb" /> : <div className="post-card-empty">NO IMAGE</div>}
      </div>
      <div className="post-card-overlay">
        <div className="post-card-overlay-inner">
          <div className="post-card-top">
            <span className="post-badge post-badge--reel">REEL</span>
            <button type="button" className="sm danger post-delete-btn" onClick={() => onDelete?.(post.id)}>삭제</button>
          </div>
          <div className="post-card-meta">
            <strong>{post.caption || '캡션 없음'}</strong>
            <p>{post.video_url || '비디오 주소 없음'}</p>
            <span>ID: {post.id}</span>
            <span>USER: {post.user_id || '-'}</span>
            <span>{formatDate(post.created_at)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ReelsSection({ reelRows, reelPageRows, reelPage, reelTotalPages, setReelPage, getReelThumb, onDelete }) {
  return (
    <div className="card admin-section">
      <div className="section-head">
        <div>
          <h2>릴스 관리</h2>
          <p>카드에 마우스를 올리면 비디오 정보가 보이도록 정리했어. ({reelRows.length}건)</p>
        </div>
        <span className="badge active">삭제 가능</span>
      </div>

      <div className="post-grid">
        {reelPageRows.map((post) => <ReelCard key={post.id} post={post} getReelThumb={getReelThumb} onDelete={onDelete} />)}
      </div>

      <div className="row post-pagination">
        <span className="post-page-label">페이지 {reelPage} / {reelTotalPages}</span>
        <div className="row">
          <button type="button" onClick={() => setReelPage((page) => Math.max(1, page - 1))} disabled={reelPage <= 1}>이전</button>
          <button type="button" onClick={() => setReelPage((page) => Math.min(reelTotalPages, page + 1))} disabled={reelPage >= reelTotalPages}>다음</button>
        </div>
      </div>
    </div>
  );
}
