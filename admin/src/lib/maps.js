const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
let mapsPromise;

export async function loadGoogleMaps() {
  if (window.google?.maps) return;
  if (mapsPromise) return mapsPromise;
  if (!GOOGLE_MAPS_KEY) throw new Error('Google Maps API key missing');

  mapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('google_maps_load_failed'));
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export function parseCoord(v) {
  const m = String(v || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}
