import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMaps';
import { db } from '../lib/internal-db';

interface Props {
  location: string;
  onBack: () => void;
}

const parseCoord = (v: string) => {
  const m = String(v || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
};

export default function LocationMapPage({ location, onBack }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMaps();
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

        const { data } = await db
          .from('posts')
          .select('location, dive_site')
          .order('created_at', { ascending: false })
          .limit(500);

        const names = Array.from(
          new Set(
            (data || [])
              .flatMap((p: any) => [p.location, p.dive_site])
              .map((v) => String(v || '').trim())
              .filter(Boolean)
          )
        );

        const bounds = new google.maps.LatLngBounds();
        let hasMarker = false;

        const addMarker = (pos: { lat: number; lng: number }, title: string, highlight = false) => {
          hasMarker = true;
          bounds.extend(pos);
          new google.maps.Marker({
            map,
            position: pos,
            title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: highlight ? 9 : 7,
              fillColor: highlight ? '#ef4444' : '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
        };

        const targetCoord = parseCoord(location);

        for (const name of names.slice(0, 120)) {
          const c = parseCoord(name);
          if (c) {
            addMarker(c, name, Boolean(targetCoord && targetCoord.lat === c.lat && targetCoord.lng === c.lng));
            continue;
          }

          await new Promise<void>((resolve) => {
            geocoder.geocode({ address: name }, (results: any, status: string) => {
              if (status === 'OK' && results?.[0]) {
                const loc = results[0].geometry.location;
                addMarker({ lat: loc.lat(), lng: loc.lng() }, name, name === location);
              }
              resolve();
            });
          });
        }

        if (targetCoord) {
          addMarker(targetCoord, location, true);
        }

        if (hasMarker) {
          map.fitBounds(bounds);
        } else {
          setError('등록된 다이빙 포인트가 없습니다.');
        }
      } catch {
        setError('지도를 불러오지 못했습니다.');
      }
    };

    init();
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
          다이빙 포인트 지도
        </div>
      </div>
      {error && (
        <div className="absolute top-16 left-4 z-10 bg-red-50 text-red-600 text-xs rounded-md px-2 py-1">{error}</div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
