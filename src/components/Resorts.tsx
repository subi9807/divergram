import { useEffect, useMemo, useState } from 'react';
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

function expandQuery(raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return [] as string[];
  const out = new Set<string>([q]);
  Object.values(REGION_ALIASES).forEach((aliases) => {
    if (aliases.some((a) => q.includes(a) || a.includes(q))) aliases.forEach((a) => out.add(a));
  });
  return [...out];
}

export default function Resorts({ onViewProfile }: ResortsProps) {
  const [items, setItems] = useState<ResortProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const loadResorts = async () => {
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
      });
    }

    setItems(resorts);
    setLoading(false);
  };

  useEffect(() => {
    loadResorts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const keys = expandQuery(query);
    let rows = items.filter((r) => {
      if (!keys.length) return true;
      const hay = [r.username, r.full_name, r.bio, r.website, r.resort_address, r.resort_region]
        .map((v) => String(v || '').toLowerCase())
        .join(' ');
      return keys.some((k) => hay.includes(k));
    });

    rows = [...rows].sort((a, b) => (Number(b.resort_review_count || 0)) - (Number(a.resort_review_count || 0)));

    return rows;
  }, [items, query]);


  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto text-gray-900 dark:text-gray-100">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">리조트</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">원하는 리조트를 검색하고 세부페이지에서 자세한 정보를 확인해보세요.</p>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <div key={r.id} onClick={() => onViewProfile(r.id)} className="rounded-2xl border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
              <div className="relative h-36 md:h-40">
                <img src={r.cover_url} alt={`${r.username} cover`} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
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

              <div className="p-4">
                {r.bio ? <p className="text-sm line-clamp-3">{r.bio}</p> : <p className="text-sm text-gray-500">소개가 아직 없습니다.</p>}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
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
                  <div>⭐ {Number(r.resort_rating_avg || 0).toFixed(1)} ({Number(r.resort_review_count || 0)}개 리뷰)</div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
