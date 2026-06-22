function ReelRow({ post, onDelete, getReelThumb }) {
  const thumb = getReelThumb?.(post);
  return (
    <tr>
      <td>
        {thumb ? (
          <img src={thumb} alt="thumb" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <span style={{ color: '#9ca3af' }}>-</span>
        )}
      </td>
      <td>{post.id}</td>
      <td>{post.user_id}</td>
      <td>{post.caption || '-'}</td>
      <td style={{ maxWidth: 300, wordBreak: 'break-all' }}>{post.video_url || '-'}</td>
      <td>{post.created_at ? new Date(post.created_at).toLocaleString() : '-'}</td>
      <td>
        <button type="button" className="sm danger" onClick={() => onDelete?.(post.id)}>삭제</button>
      </td>
    </tr>
  );
}

export default function ReelsSection({ reelRows, reelPageRows, reelPage, reelTotalPages, setReelPage, getReelThumb, onDelete }) {
  return (
    <div className="card admin-section">
      <div className="section-head">
        <div>
          <h2>릴스 관리</h2>
          <p>비디오 기반 릴스 게시물 목록 ({reelRows.length}건)</p>
        </div>
        <span className="badge active">삭제 가능</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>THUMB</th>
            <th>ID</th>
            <th>USER</th>
            <th>CAPTION</th>
            <th>VIDEO URL</th>
            <th>CREATED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>{reelPageRows.map((post) => <ReelRow key={post.id} post={post} getReelThumb={getReelThumb} onDelete={onDelete} />)}</tbody>
      </table>
      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <span style={{ color: '#6b7280', fontSize: 13 }}>페이지 {reelPage} / {reelTotalPages}</span>
        <div className="row">
          <button type="button" onClick={() => setReelPage((page) => Math.max(1, page - 1))} disabled={reelPage <= 1}>이전</button>
          <button type="button" onClick={() => setReelPage((page) => Math.min(reelTotalPages, page + 1))} disabled={reelPage >= reelTotalPages}>다음</button>
        </div>
      </div>
    </div>
  );
}
