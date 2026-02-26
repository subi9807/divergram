import { useEffect, useRef, useState } from 'react';
import { db } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

interface StoriesProps {
  onUserSelect: (userId: string) => void;
}

interface UserWithRecentPost {
  id: string;
  username: string;
  avatar_url: string;
  latest_post_date?: string;
}

export default function Stories({ onUserSelect }: StoriesProps) {
  const [users, setUsers] = useState<UserWithRecentPost[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadSuggestedUsers();
    }
  }, [user]);

  const loadSuggestedUsers = async () => {
    if (!user) return;

    const { data: followingData } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = followingData?.map(f => f.following_id) || [];
    const result: UserWithRecentPost[] = [];

    if (followingIds.length > 0) {
      const { data: postsData } = await db
        .from('posts')
        .select(`
          user_id,
          created_at,
          profiles!posts_user_id_fkey(id, username, avatar_url)
        `)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false });

      const userMap = new Map<string, UserWithRecentPost>();

      postsData?.forEach((post: any) => {
        const userId = post.user_id;
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: post.profiles.id,
            username: post.profiles.username,
            avatar_url: post.profiles.avatar_url,
            latest_post_date: post.created_at
          });
        }
      });

      result.push(...Array.from(userMap.values())
        .sort((a, b) => {
          const dateA = a.latest_post_date ? new Date(a.latest_post_date).getTime() : 0;
          const dateB = b.latest_post_date ? new Date(b.latest_post_date).getTime() : 0;
          return dateB - dateA;
        }));
    }

    if (result.length < 20 && followingIds.length > 0) {
      const alreadyIncludedIds = new Set(result.map(u => u.id));
      const remainingFollowing = followingIds.filter(id => !alreadyIncludedIds.has(id));

      if (remainingFollowing.length > 0) {
        const { data: followingProfiles } = await db
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', remainingFollowing)
          .limit(20 - result.length);

        if (followingProfiles) {
          result.push(...followingProfiles.map(profile => ({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url
          })));
        }
      }
    }

    if (result.length < 20) {
      const { data: myFollowersData } = await db
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      const myFollowerIds = myFollowersData?.map(f => f.follower_id) || [];

      if (myFollowerIds.length > 0) {
        const alreadyIncludedIds = new Set(result.map(u => u.id));
        const mutualFollowerIds = followingIds.length > 0
          ? myFollowerIds.filter(id => {
              let hasCommonFollowing = false;
              followingIds.forEach(followingId => {
                if (myFollowerIds.includes(followingId) || id === followingId) {
                  hasCommonFollowing = true;
                }
              });
              return hasCommonFollowing && !alreadyIncludedIds.has(id);
            })
          : myFollowerIds.filter(id => !alreadyIncludedIds.has(id));

        if (mutualFollowerIds.length > 0) {
          const { data: mutualProfiles } = await db
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', mutualFollowerIds)
            .limit(20 - result.length);

          if (mutualProfiles) {
            result.push(...mutualProfiles.map(profile => ({
              id: profile.id,
              username: profile.username,
              avatar_url: profile.avatar_url
            })));
          }
        }
      }
    }

    setUsers(result.slice(0, 20));
  };

  const scrollByAmount = (dir: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.round(el.clientWidth * 0.8);
    el.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <div className="px-4 md:px-0 py-4 bg-white dark:bg-[#121212] transition-colors">
      <div className="mx-auto max-w-[620px] flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => scrollByAmount('left')}
          className="h-14 w-14 rounded-full border border-gray-300 text-gray-600 text-2xl hover:bg-gray-100"
          aria-label="이전"
        >
          ‹
        </button>
        <div ref={scrollerRef} className="w-[520px] overflow-x-auto scrollbar-hide snap-x snap-mandatory touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex w-max space-x-8">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user.id)}
                className="flex flex-col items-center space-y-2 flex-shrink-0 snap-start"
              >
                <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                  <div className="w-full h-full rounded-full bg-white dark:bg-[#121212] p-0.5 flex items-center justify-center transition-colors">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-100 dark:bg-[#262626] flex items-center justify-center transition-colors">
                        <span className="text-gray-600 dark:text-gray-400 font-semibold text-lg">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-900 dark:text-white max-w-[80px] truncate">{user.username}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => scrollByAmount('right')}
          className="h-14 w-14 rounded-full border border-gray-300 text-gray-600 text-2xl hover:bg-gray-100"
          aria-label="다음"
        >
          ›
        </button>
      </div>

    </div>
  );
}
