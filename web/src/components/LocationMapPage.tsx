import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MapPin, Navigation, Waves } from 'lucide-react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { loadGoogleMaps } from '../utils/googleMaps';
import { db } from '../lib/internal-db';

interface Props {
  location: string;
  onBack: () => void;
}

type LatLng = { lat: number; lng: number };
type MapPost = {
  id: string;
  caption?: string;
  location?: string | null;
  dive_site?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  created_at?: string;
  location_lat?: number | null;
  location_lng?: number | null;
};
type DivePoint = { key: string; title: string; pos: LatLng; posts: MapPost[]; highlight: boolean };

const KNOWN_DIVE_POINTS: Record<string, LatLng> = {
  jeju: { lat: 33.3617, lng: 126.5292 },
  제주: { lat: 33.3617, lng: 126.5292 },
  seogwipo: { lat: 33.2539, lng: 126.5596 },
  서귀포: { lat: 33.2539, lng: 126.5596 },
  bali: { lat: -8.3405, lng: 115.092 },
  발리: { lat: -8.3405, lng: 115.092 },
  cebu: { lat: 10.3157, lng: 123.8854 },
  세부: { lat: 10.3157, lng: 123.8854 },
  bohol: { lat: 9.8499, lng: 124.1435 },
  보홀: { lat: 9.8499, lng: 124.1435 },
  okinawa: { lat: 26.2124, lng: 127.6809 },
  오키나와: { lat: 26.2124, lng: 127.6809 },
  maldives: { lat: 3.2028, lng: 73.2207 },
  몰디브: { lat: 3.2028, lng: 73.2207 },
  palau: { lat: 7.515, lng: 134.5825 },
  팔라우: { lat: 7.515, lng: 134.5825 },
  anilao: { lat: 13.7597, lng: 120.9271 },
  아닐라오: { lat: 13.7597, lng: 120.9271 },
};

const parseCoord = (v: string): LatLng | null => {
  const m = String(v || '').match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const normalizeName = (value: string) => String(value || '').trim().toLowerCase().replace(/^@/, '');

const getKnownCoord = (value: string): LatLng | null => {
  const normalized = normalizeName(value);
  if (!normalized) return null;
  if (KNOWN_DIVE_POINTS[normalized]) return KNOWN_DIVE_POINTS[normalized];
  const found = Object.entries(KNOWN_DIVE_POINTS).find(([key]) => normalized.includes(key));
  return found?.[1] || null;
};

const getPostPoint = (post: MapPost): { title: string; pos: LatLng } | null => {
  const title = String(post.dive_site || post.location || '').replace(/^@/, '').trim();
  if (typeof post.location_lat === 'number' && typeof post.location_lng === 'number') {
    return { title: title || `${post.location_lat.toFixed(6)}, ${post.location_lng.toFixed(6)}`, pos: { lat: post.location_lat, lng: post.location_lng } };
  }
  const coord = parseCoord(String(post.location || '')) || parseCoord(String(post.dive_site || ''));
  if (coord) return { title: title || `${coord.lat.toFixed(6)}, ${coord.lng.toFixed(6)}`, pos: coord };
  const known = getKnownCoord(String(post.dive_site || post.location || ''));
  if (known) return { title: title || '다이빙 포인트', pos: known };
  return null;
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
];

export default function LocationMapPage({ location, onBack }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRefs = useRef<Record<string, any>>({});
  const [error, setError] = useState('');
  const [points, setPoints] = useState<DivePoint[]>([]);
  const [activeKey, setActiveKey] = useState<string>('');

  const selectedPoint = useMemo(() => points.find((p) => p.key === activeKey) || points[0], [activeKey, points]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        setError('');
        await loadGoogleMaps();
        if (cancelled || !mapRef.current) return;
        if (!(window as any).google) {
          setError('Google Maps 초기화에 실패했습니다. API 키/도메인 설정을 확인해주세요.');
          return;
        }
        const google = (window as any).google;

        const isDark = document.documentElement.classList.contains('dark');
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 20, lng: 125 },
          zoom: 3,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          styles: isDark ? darkMapStyle as any : undefined,
        });
        mapInstanceRef.current = map;

        const { data } = await db
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        const targetCoord = parseCoord(location);
        const targetName = normalizeName(location);
        const grouped = new Map<string, DivePoint>();

        for (const post of (data || []) as MapPost[]) {
          const point = getPostPoint(post);
          if (!point) continue;
          const key = `${point.pos.lat.toFixed(4)},${point.pos.lng.toFixed(4)}`;
          const title = point.title || post.location || post.dive_site || '다이빙 포인트';
          const highlight = Boolean(
            (targetCoord && Math.abs(targetCoord.lat - point.pos.lat) < 0.0001 && Math.abs(targetCoord.lng - point.pos.lng) < 0.0001) ||
            (targetName && normalizeName(title).includes(targetName))
          );
          const existing = grouped.get(key);
          if (existing) {
            existing.posts.push(post);
            existing.highlight = existing.highlight || highlight;
          } else {
            grouped.set(key, { key, title, pos: point.pos, posts: [post], highlight });
          }
        }

        if (targetCoord && !grouped.has(`${targetCoord.lat.toFixed(4)},${targetCoord.lng.toFixed(4)}`)) {
          grouped.set(`${targetCoord.lat.toFixed(4)},${targetCoord.lng.toFixed(4)}`, {
            key: `${targetCoord.lat.toFixed(4)},${targetCoord.lng.toFixed(4)}`,
            title: location,
            pos: targetCoord,
            posts: [],
            highlight: true,
          });
        }

        const nextPoints = Array.from(grouped.values()).sort((a, b) => Number(b.highlight) - Number(a.highlight) || b.posts.length - a.posts.length);
        if (cancelled) return;
        setPoints(nextPoints);
        setActiveKey(nextPoints[0]?.key || '');

        const bounds = new google.maps.LatLngBounds();
        const markers: any[] = [];
        const infoWindow = new google.maps.InfoWindow();
        markerRefs.current = {};

        for (const point of nextPoints) {
          bounds.extend(point.pos);
          const marker = new google.maps.Marker({
            position: point.pos,
            title: point.title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: point.highlight ? 10 : 7,
              fillColor: point.highlight ? '#ef4444' : '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
          marker.addListener('click', () => {
            setActiveKey(point.key);
            const recent = point.posts.slice(0, 3).map((p) => `<li>${String(p.caption || '게시글').slice(0, 36)}</li>`).join('');
            infoWindow.setContent(`<div style="min-width:180px"><strong>${point.title}</strong><div style="margin-top:4px;color:#666">게시글 ${point.posts.length}개</div>${recent ? `<ul style="margin:8px 0 0 16px;padding:0;font-size:12px">${recent}</ul>` : ''}</div>`);
            infoWindow.open({ anchor: marker, map });
          });
          markers.push(marker);
          markerRefs.current[point.key] = marker;
        }

        if (markers.length) {
          new MarkerClusterer({ map, markers });
          map.fitBounds(bounds);
          if (markers.length === 1) map.setZoom(Math.min(map.getZoom() || 12, 12));
        } else {
          setError('지도에 표시할 좌표가 있는 게시글이 아직 없습니다. 게시글 작성 시 지도에서 핀을 찍으면 자동 저장됩니다.');
        }
      } catch (e: any) {
        setError(e?.message || '지도를 불러오지 못했습니다.');
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [location]);

  const focusPoint = (point: DivePoint) => {
    setActiveKey(point.key);
    mapInstanceRef.current?.panTo(point.pos);
    mapInstanceRef.current?.setZoom(Math.max(mapInstanceRef.current?.getZoom?.() || 6, 9));
    markerRefs.current[point.key]?.setAnimation?.((window as any).google?.maps?.Animation?.BOUNCE);
    window.setTimeout(() => markerRefs.current[point.key]?.setAnimation?.(null), 700);
  };

  return (
    <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden bg-gray-100 dark:bg-black xl:h-screen">
      <div ref={mapRef} className="h-full w-full" />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-[#262626] dark:bg-[#121212]/95">
        <button onClick={onBack} className="rounded-xl p-1.5 hover:bg-gray-100 dark:hover:bg-[#262626]">
          <ArrowLeft className="h-4 w-4 dark:text-white" />
        </button>
        <div className="flex items-center gap-1 text-sm font-semibold dark:text-white">
          <MapPin className="h-4 w-4 text-red-500" />
          다이빙 포인트 지도
        </div>
      </div>

      <div className="absolute right-4 top-4 z-10 hidden w-80 rounded-[28px] border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-[#262626] dark:bg-[#121212]/95 md:block">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Dive Map</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">포인트 {points.length}곳</h2>
          </div>
          <div className="rounded-2xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"><Waves className="h-5 w-5" /></div>
        </div>
        <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {points.slice(0, 20).map((point) => (
            <button key={point.key} onClick={() => focusPoint(point)} className={`w-full rounded-2xl border px-3 py-3 text-left transition ${activeKey === point.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-gray-100 bg-gray-50 hover:bg-gray-100 dark:border-[#25282e] dark:bg-[#17191d] dark:hover:bg-[#202329]'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{point.title}</p>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-[#25282e] dark:text-gray-300">{point.posts.length}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{point.pos.lat.toFixed(4)}, {point.pos.lng.toFixed(4)}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedPoint && (
        <div className="absolute inset-x-3 bottom-20 z-10 rounded-[28px] border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-[#262626] dark:bg-[#121212]/95 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-500">현재 포인트</p>
              <h3 className="mt-1 text-base font-bold text-gray-900 dark:text-white">{selectedPoint.title}</h3>
              <p className="mt-1 text-xs text-gray-500">게시글 {selectedPoint.posts.length}개 · {points.length}개 포인트</p>
            </div>
            <button onClick={() => focusPoint(selectedPoint)} className="rounded-2xl bg-black p-3 text-white dark:bg-white dark:text-black"><Navigation className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute left-4 right-4 top-16 z-10 rounded-2xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600 shadow md:right-auto">{error}</div>
      )}
    </div>
  );
}
