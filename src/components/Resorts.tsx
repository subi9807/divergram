import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  const [items, setItems] = useState<ResortProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [savingReview, setSavingReview] = useState(false);

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

  const submitReview = async () => {
    if (!user || !selectedId || savingReview) return;
    setSavingReview(true);

    await db.from('resort_reviews').insert({
      resort_id: selectedId,
      user_id: user.id,
      rating,
      content: reviewText.trim() || null,
      created_at: new Date().toISOString(),
    });

    const { data: reviews } = await db
      .from('resort_reviews')
      .select('rating')
      .eq('resort_id', selectedId);

    const count = (reviews || []).length;
    const avg = count ? (reviews || []).reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / count : 0;

    await db.from('profiles').update({
      resort_rating_avg: Number(avg.toFixed(2)),
      resort_review_count: count,
    }).eq('id', selectedId);

    setReviewText('');
    setSelectedId(null);
    setSavingReview(false);
    loadResorts();
  };

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto text-gray-900 dark:text-gray-100">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">리조트</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">가까운 리조트부터 확인하고, 리뷰를 남겨 신뢰도 높은 정보를 만들어보세요.</p>
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
            <div key={r.id} className="rounded-2xl border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] overflow-hidden">
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
                  <div>📍 {r.resort_address || '주소 미등록'}</div>
                  <div>⭐ {Number(r.resort_rating_avg || 0).toFixed(1)} ({Number(r.resort_review_count || 0)}개 리뷰)</div>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                  <button
                    onClick={() => onViewProfile(r.id)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-[#3a3a3a] text-sm hover:bg-gray-50 dark:hover:bg-[#1f1f1f]"
                  >
                    프로필 보기
                  </button>
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className="px-3 py-2 rounded-lg border border-amber-300 text-amber-700 dark:text-amber-400 text-sm hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    리뷰 남기기
                  </button>
                  {r.website ? (
                    <a
                      href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
                    >
                      웹사이트
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedId && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#262626] p-4">
            <h3 className="text-lg font-semibold mb-3">리뷰 남기기</h3>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-500">별점</span>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded-lg border px-2 py-1 bg-transparent">
                {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n}점</option>)}
              </select>
            </div>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] p-3 min-h-24"
              placeholder="리조트 경험을 간단히 적어주세요"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-2 rounded-lg border" onClick={() => setSelectedId(null)}>취소</button>
              <button className="px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={submitReview} disabled={savingReview || !user}>{savingReview ? '저장중...' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
