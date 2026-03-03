import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../lib/internal-db';

interface ResortProfile {
  id: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
  cover_url?: string;
  resort_address?: string;
  resort_region?: string;
  resort_lat?: number | null;
  resort_lng?: number | null;
  resort_rating_avg?: number | null;
  resort_review_count?: number | null;
  distanceKm?: number | null;
}

interface ResortsProps {
  onViewProfile: (userId: string) => void;
}

const REGION_ALIASES: Record<string, string[]> = {
  philippines: ['필리핀', 'philippines', 'pilipinas'],
  cebu: ['세부', 'cebu'],
  bohol: ['보홀', 'bohol'],
  korea: ['한국', 'korea'],
  jeju: ['제주', 'jeju'],
  bali: ['발리', 'bali'],
  indonesia: ['인도네시아', 'indonesia'],
};

const PAGE_SIZE = 20;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function expandQuery(raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return [] as string[];
  const out = new Set<string>([q]);
  Object.values(REGION_ALIASES).forEach((aliases) => {
    if (aliases.some((a) => q.includes(a) || a.includes(q))) aliases.forEach((a) => out.add(a));
  });
  return [...out];
}

function hashNum(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function deriveTags(r: ResortProfile) {
  const all = ['초보환영', '보트다이빙', '야간다이빙', '한국어가능', '장비렌탈'];
  const h = hashNum(r.username);
  return [all[h % all.length], all[(h + 2) % all.length], all[(h + 4) % all.length]];
}

function deriveFacilities(r: ResortProfile) {
  const opts = ['🚿 샤워실', '🧰 장비렌탈', '🚐 픽업', '🏨 숙소연계', '🅿️ 주차'];
  const h = hashNum(r.username + 'fac');
  return [opts[h % opts.length], opts[(h + 1) % opts.length], opts[(h + 3) % opts.length]];
}

function derivePromo(r: ResortProfile) {
  const promos = ['첫 방문 10% 할인', '체험다이빙 1+1', '주말 패키지 특가', '장비렌탈 무료'];
  return promos[hashNum(r.username + 'promo') % promos.length];
}

export default function Resorts({ onViewProfile }: ResortsProps) {
  const [items, setItems] = useState<ResortProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('dg_resort_favorites') || '[]'); } catch { return []; }
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPromptHidden, setLocationPromptHidden] = useState(() => localStorage.getItem('dg_resort_loc_prompt') === 'hidden');
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadResorts = async (position?: { lat: number; lng: number } | null) => {
    setLoading(true);
    const { data } = await db
      .from('profiles')
      .select('id, username, full_name, bio, avatar_url, website, account_type, resort_address, resort_region, resort_lat, resort_lng, resort_rating_avg, resort_review_count')
      .eq('account_type', 'resort');

    const resorts = ((data || []) as ResortProfile[]);
    const ids = resorts.map((r) => r.id);
    if (ids.length > 0) {
      const { data: posts } = await db
        .from('posts')
        .select('user_id, image_url, created_at')
        .in('user_id', ids)
        .order('created_at', { ascending: false });

      const coverMap = new Map<string, string>();
      (posts || []).forEach((p: any) => {
        if (!coverMap.has(p.user_id) && p.image_url) coverMap.set(p.user_id, p.image_url);
      });

      resorts.forEach((r) => {
        r.cover_url = coverMap.get(r.id) || `https://picsum.photos/seed/resort-${r.username}/900/520`;
        if (position && r.resort_lat != null && r.resort_lng != null) {
          r.distanceKm = haversineKm(position.lat, position.lng, Number(r.resort_lat), Number(r.resort_lng));
        }
      });
    }

    setItems(resorts);
    setLoading(false);
  };

  useEffect(() => {
    loadResorts(myPos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPos]);

  useEffect(() => {
    localStorage.setItem('dg_resort_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const filtered = useMemo(() => {
    const keys = expandQuery(query);
    let rows = items.filter((r) => {
      if (!keys.length) return true;
      const hay = [r.username, r.full_name, r.bio, r.website, r.resort_address, r.resort_region]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return keys.some((k) => hay.includes(k));
    });

    rows = [...rows].sort((a, b) => {
      if (myPos) {
        const ad = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const bd = b.distanceKm ?? Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
      }
      return Number(b.resort_review_count || 0) - Number(a.resort_review_count || 0);
    });

    return rows;
  }, [items, query, myPos]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, myPos]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.some((e) => e.isIntersecting);
      if (hit) setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length));
    }, { rootMargin: '180px' });
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  const requestNearbySort = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMyPos(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto text-gray-900 dark:text-gray-100">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">리조트</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">원하는 리조트를 검색하고 세부페이지에서 자세한 정보를 확인해보세요.</p>
      </div>

      {!locationPromptHidden && !myPos && (
        <div className="mb-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/30 p-3 flex items-center justify-between gap-3">
          <div className="text-sm text-sky-700 dark:text-sky-300">가까운 리조트 순으로 보려면 위치 접근을 허용하세요.</div>
          <div className="flex gap-2 shrink-0">
            <button className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs" onClick={requestNearbySort}>허용</button>
            <button
              className="px-3 py-1.5 rounded-lg border text-xs"
              onClick={() => {
                setLocationPromptHidden(true);
                localStorage.setItem('dg_resort_loc_prompt', 'hidden');
              }}
            >나중에</button>
          </div>
        </div>
      )}

      <div className="mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="w-full rounded-xl border border-gray-300 dark:border-[#262626] bg-white dark:bg-[#1a1a1a] px-4 py-3 text-sm"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-gray-500">조건에 맞는 리조트가 없습니다.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleItems.map((r) => (
              <div key={r.id} onClick={() => onViewProfile(r.id)} className="rounded-2xl border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                <div className="relative h-56 md:h-60">
                  <img src={r.cover_url} alt={`${r.username} cover`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

                  <div className="absolute right-3 top-3 flex items-center gap-2">
                    <span className="text-[11px] px-2 py-1 rounded-full bg-amber-400/90 text-amber-900 font-semibold">{derivePromo(r)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFavorites((prev) => prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]);
                      }}
                      className="w-8 h-8 rounded-full bg-black/40 text-white text-lg flex items-center justify-center"
                      aria-label="즐겨찾기"
                    >
                      {favorites.includes(r.id) ? '♥' : '♡'}
                    </button>
                  </div>

                  <div className="absolute left-3 bottom-3 flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/80 shrink-0 border border-white/70">
                      {r.avatar_url ? <img src={r.avatar_url} alt={r.username} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="text-white min-w-0">
                      <p className="font-semibold truncate">{r.full_name || r.username}</p>
                      <p className="text-xs text-white/85">@{r.username}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {deriveTags(r).map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{tag}</span>
                    ))}
                  </div>

                  {r.bio ? <p className="text-sm leading-6 line-clamp-5">{r.bio}</p> : <p className="text-sm text-gray-500">소개가 아직 없습니다.</p>}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {deriveFacilities(r).map((f) => (
                      <span key={f} className="text-[11px] px-2 py-1 rounded-md bg-gray-100 dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-300">{f}</span>
                    ))}
                  </div>

                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const loc = r.resort_address || r.resort_region || '';
                        if (!loc) return;
                        window.history.pushState({}, '', `/location?loc=${encodeURIComponent(loc)}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="hover:underline text-left"
                    >📍 {r.resort_address || '주소 미등록'}</button>
                    <div>⭐ {Number(r.resort_rating_avg || 0).toFixed(1)} ({Number(r.resort_review_count || 0)}개 리뷰){myPos && r.distanceKm != null ? ` · ${r.distanceKm.toFixed(1)}km` : ''}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div ref={sentinelRef} className="h-10" />
        </>
      )}
    </div>
  );
}
