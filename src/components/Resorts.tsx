import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/internal-db';

interface ResortProfile {
  id: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  website?: string;
}

interface ResortsProps {
  onViewProfile: (userId: string) => void;
}

export default function Resorts({ onViewProfile }: ResortsProps) {
  const [items, setItems] = useState<ResortProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await db
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url, website, account_type')
        .eq('account_type', 'resort');
      setItems((data || []) as ResortProfile[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      [r.username, r.full_name, r.bio, r.website].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [items, query]);

  return (
    <div className="px-4 md:px-6 py-6 max-w-5xl mx-auto text-gray-900 dark:text-gray-100">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">리조트</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">리조트 회원을 둘러보고 문의/예약 전 정보를 확인해보세요.</p>
      </div>

      <div className="mb-5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="리조트명, 소개, 웹사이트 검색"
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
            <div key={r.id} className="rounded-2xl border border-gray-200 dark:border-[#262626] bg-white dark:bg-[#121212] p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-[#262626] shrink-0">
                  {r.avatar_url ? <img src={r.avatar_url} alt={r.username} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{r.full_name || r.username}</p>
                  <p className="text-sm text-gray-500">@{r.username}</p>
                </div>
              </div>

              {r.bio ? <p className="text-sm mt-3 line-clamp-3">{r.bio}</p> : <p className="text-sm mt-3 text-gray-500">소개가 아직 없습니다.</p>}

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => onViewProfile(r.id)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-[#3a3a3a] text-sm hover:bg-gray-50 dark:hover:bg-[#1f1f1f]"
                >
                  프로필 보기
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
          ))}
        </div>
      )}
    </div>
  );
}
