let googleMapsLoaded = false;
let googleMapsPromise: Promise<void> | null = null;

export const loadGoogleMaps = (): Promise<void> => {
  if (googleMapsLoaded) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      console.warn('Google Maps API key not configured');
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};
