const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
let mapsPromise;

export async function loadGoogleMaps() {
  if (window.google?.maps?.Map) return window.google.maps;
  if (window.google?.maps?.importLibrary) {
    await window.google.maps.importLibrary('maps');
    return window.google.maps;
  }
  if (mapsPromise) return mapsPromise;
  if (!GOOGLE_MAPS_KEY) throw new Error('Google Maps API key missing');

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__divergramGoogleMapsReady';
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&loading=async&v=weekly&callback=${callbackName}`;
    s.async = true;
    s.defer = true;
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      mapsPromise = undefined;
      reject(new Error('google_maps_load_timeout'));
    }, 15000);
    window[callbackName] = async () => {
      try {
        await window.google.maps.importLibrary('maps');
        cleanup();
        resolve(window.google.maps);
      } catch (error) {
        cleanup();
        mapsPromise = undefined;
        reject(error);
      }
    };
    s.onerror = () => {
      cleanup();
      mapsPromise = undefined;
      reject(new Error('google_maps_load_failed'));
    };
    window.gm_authFailure = () => {
      cleanup();
      mapsPromise = undefined;
      reject(new Error('google_maps_auth_failed'));
    };
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export function parseCoord(v) {
  const m = String(v || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}
