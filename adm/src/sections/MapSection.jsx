export default function MapSection({ mapRef, mapError, pointCount = 0 }) {
  return (
    <div className="map-full">
      <div className="map-operation-card">
        <p className="section-kicker">LIVE MAP</p><h2>다이빙 포인트 운영 지도</h2>
        <div><span><i className="map-dot is-point" />등록 포인트 <strong>{pointCount}</strong></span><span><i className="map-dot is-cluster" />확대하면 그룹 해제</span></div>
      </div>
      {mapError ? <p className="map-operation-error" role="status">{mapError}</p> : null}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
