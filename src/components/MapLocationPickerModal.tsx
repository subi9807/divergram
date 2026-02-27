import { useEffect, useRef, useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMaps';

interface MapLocationPickerModalProps {
  isOpen: boolean;
  initialLocation?: string;
  onClose: () => void;
  onSelect: (payload: { locationText: string; lat: number; lng: number }) => void;
}

export default function MapLocationPickerModal({ isOpen, initialLocation, onClose, onSelect }: MapLocationPickerModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number; locationText: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMaps();
        if (cancelled || !mapRef.current || !(window as any).google) return;

        const google = (window as any).google;
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 33.4996, lng: 126.5312 },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapInstanceRef.current = map;

        if (initialLocation) {
          const coordMatch = initialLocation.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
          if (coordMatch) {
            const lat = Number(coordMatch[1]);
            const lng = Number(coordMatch[2]);
            const pos = { lat, lng };
            map.setCenter(pos);
            map.setZoom(13);
            markerRef.current = new google.maps.Marker({ map, position: pos });
            setSelected({ lat, lng, locationText: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
          } else {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: initialLocation }, (results: any, status: string) => {
              if (status === 'OK' && results && results[0]) {
                const loc = results[0].geometry.location;
                map.setCenter(loc);
                map.setZoom(13);
                markerRef.current = new google.maps.Marker({ map, position: loc });
                setSelected({ lat: loc.lat(), lng: loc.lng(), locationText: `${loc.lat().toFixed(6)}, ${loc.lng().toFixed(6)}` });
              }
            });
          }
        }

        map.addListener('click', (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();

          if (markerRef.current) markerRef.current.setMap(null);
          markerRef.current = new google.maps.Marker({ map, position: { lat, lng } });

          const geocoder = new google.maps.Geocoder();
          const coordText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setSelected({ lat, lng, locationText: coordText });
        });
      } catch (e) {
        console.error('Map picker init failed:', e);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialLocation]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 rounded-xl overflow-hidden border border-gray-200 dark:border-[#262626]">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#262626] flex items-center justify-between">
          <h3 className="font-semibold dark:text-white flex items-center gap-2"><MapPin className="h-4 w-4" /> 지도에서 위치 선택</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5 dark:text-white" /></button>
        </div>

        <div ref={mapRef} className="w-full h-[420px]" />

        <div className="px-4 py-3 border-t border-gray-200 dark:border-[#262626] space-y-3">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {selected ? `선택 위치: ${selected.locationText}` : '지도를 클릭해 핀을 찍어주세요.'}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-700 dark:text-gray-300">취소</button>
            <button
              disabled={!selected}
              onClick={() => selected && onSelect(selected)}
              className="px-4 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
            >
              이 위치 사용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
