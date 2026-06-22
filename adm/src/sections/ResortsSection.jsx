export default function ResortsSection({ resorts, resortQuery, setResortQuery, refreshResorts, updateResort }) {
  return (
    <div className="card users-card-wrap">
      <h2>리조트 관리</h2>
      <div className="row" style={{ marginBottom: 12 }}>
        <input value={resortQuery} onChange={(e) => setResortQuery(e.target.value)} placeholder="리조트 검색" />
        <button onClick={refreshResorts}>검색</button>
      </div>

      {resorts.length === 0 ? (
        <p style={{ color: '#6b7280' }}>리조트 데이터가 없습니다.</p>
      ) : (
        <div className="users-grid">
          {resorts.map((r) => (
            <div key={r.id} className="user-card">
              <div className="user-card-top">
                <div>
                  <div className="user-name">{r.full_name || r.username}</div>
                  <div className="user-email">@{r.username}</div>
                </div>
                <div className="user-badges">
                  <span className="badge admin">resort</span>
                </div>
              </div>
              <div className="user-meta">📍 {r.resort_address || '-'} · ⭐ {Number(r.resort_rating_avg || 0).toFixed(1)} ({Number(r.resort_review_count || 0)})</div>
              <div className="actions">
                <button className="sm" onClick={() => updateResort(r.id, { resort_region: prompt('지역', r.resort_region || '') || r.resort_region })}>지역</button>
                <button className="sm" onClick={() => updateResort(r.id, { resort_address: prompt('주소', r.resort_address || '') || r.resort_address })}>주소</button>
                <button className="sm" onClick={() => updateResort(r.id, { website: prompt('웹사이트', r.website || '') || r.website })}>웹사이트</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
