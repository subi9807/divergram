export default function MapSection({ mapRef, mapError }) {
  return (
    <div className="map-full">
      {mapError ? <p className="error" style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>{mapError}</p> : null}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
