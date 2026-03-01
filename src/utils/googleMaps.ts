let googleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

export const loadGoogleMaps = (): Promise<void> => {
  if (googleMapsLoaded) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

    if (!apiKey) {
      googleMapsPromise = null;
      reject(new Error('Google Maps API key is missing (VITE_GOOGLE_MAPS_API_KEY).'));
      return;
    }

    // already present in DOM
    if (document.querySelector('script[data-google-maps="true"]')) {
      const wait = () => {
        if ((window as any).google?.maps) {
          googleMapsLoaded = true;
          resolve();
        } else {
          window.setTimeout(wait, 50);
        }
      };
      wait();
      return;
    }

    const script = document.createElement('script');
    script.dataset.googleMaps = 'true';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if ((window as any).google?.maps) {
        googleMapsLoaded = true;
        resolve();
      } else {
        googleMapsPromise = null;
        reject(new Error('Google Maps loaded, but window.google.maps is unavailable.'));
      }
    };

    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error('Failed to load Google Maps script. Check API key/referrer restrictions.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};
