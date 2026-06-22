function FeedRow({ post, onDelete }) {
  return (
    <tr>
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

export default function FeedsSection({ feedRows, feedPageRows, feedPage, feedTotalPages, setFeedPage, onDelete }) {
  return (
    <div className="card admin-section">
      <div className="section-head">
        <div>
          <h2>피드 관리</h2>
          <p>이미지 기반 피드 게시물 목록 ({feedRows.length}건)</p>
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
            <th>LOCATION</th>
            <th>CREATED</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>{feedPageRows.map((post) => <FeedRow key={post.id} post={post} onDelete={onDelete} />)}</tbody>
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
