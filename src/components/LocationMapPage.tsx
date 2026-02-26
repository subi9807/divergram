import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMaps';

interface Props {
  location: string;
  onBack: () => void;
}

export default function LocationMapPage({ location, onBack }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || !(window as any).google) return;
        const google = (window as any).google;
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 36.5, lng: 127.8 },
          zoom: 7,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: location }, (results: any, status: string) => {
          if (status === 'OK' && results?.[0]) {
            const loc = results[0].geometry.location;
            map.setCenter(loc);
            map.setZoom(12);
            new google.maps.Marker({
              map,
              position: loc,
              title: location,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
            });
          } else {
            setError('위치를 찾을 수 없습니다.');
          }
        });
      })
      .catch(() => setError('지도를 불러오지 못했습니다.'));

    return () => {
      cancelled = true;
    };
  }, [location]);

  return (
    <div className="w-full h-[calc(100vh-64px)] xl:h-screen relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-[#262626] px-3 py-2">
        <button onClick={onBack} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#262626]">
          <ArrowLeft className="h-4 w-4 dark:text-white" />
        </button>
        <div className="text-sm font-semibold dark:text-white flex items-center gap-1">
          <MapPin className="h-4 w-4 text-red-500" />
          {location}
        </div>
      </div>
      {error && (
        <div className="absolute top-16 left-4 z-10 bg-red-50 text-red-600 text-xs rounded-md px-2 py-1">{error}</div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
