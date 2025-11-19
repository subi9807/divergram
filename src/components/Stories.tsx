import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase, Profile } from '../lib/supabase';
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
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadMyProfile();
      loadSuggestedUsers();
    }
  }, [user]);

  const loadMyProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setMyProfile(data);
    }
  };

  const loadSuggestedUsers = async () => {
    if (!user) return;

    const { data: followingData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = followingData?.map(f => f.following_id) || [];
    const result: UserWithRecentPost[] = [];

    if (followingIds.length > 0) {
      const { data: postsData } = await supabase
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

    if (result.length < 10 && followingIds.length > 0) {
      const alreadyIncludedIds = new Set(result.map(u => u.id));
      const remainingFollowing = followingIds.filter(id => !alreadyIncludedIds.has(id));

      if (remainingFollowing.length > 0) {
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', remainingFollowing)
          .limit(10 - result.length);

        if (followingProfiles) {
          result.push(...followingProfiles.map(profile => ({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url
          })));
        }
      }
    }

    if (result.length < 10) {
      const { data: myFollowersData } = await supabase
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
          const { data: mutualProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', mutualFollowerIds)
            .limit(10 - result.length);

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

    setUsers(result.slice(0, 10));
  };

  return (
      <div className="p-6 flex w-full space-x-6 overflow-x-scroll scrollbar-hide bg-white dark:bg-black transition-colors justify-center">
        <button
          onClick={() => user && onUserSelect(user.id)}
          className="flex flex-col items-center space-y-2 flex-shrink-0"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 p-0.5">
              <div className="w-full h-full rounded-full bg-white dark:bg-black p-0.5 flex items-center justify-center transition-colors">
                {myProfile?.avatar_url ? (
                  <img
                    src={myProfile.avatar_url}
                    alt={myProfile.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors">
                    <span className="text-gray-600 dark:text-gray-400 font-semibold text-2xl">
                      {myProfile?.username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center transition-colors">
              <Plus className="h-4 w-4 text-white" />
            </div>
          </div>
          <span className="text-sm text-gray-900 dark:text-white max-w-[96px] truncate">내 스토리</span>
        </button>

        {users.map((user) => (
          <button
            key={user.id}
            onClick={() => onUserSelect(user.id)}
            className="flex flex-col items-center space-y-2 flex-shrink-0"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
              <div className="w-full h-full rounded-full bg-white dark:bg-black p-0.5 flex items-center justify-center transition-colors">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors">
                    <span className="text-gray-600 dark:text-gray-400 font-semibold text-2xl">
                      {user.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-900 dark:text-white max-w-[96px] truncate">{user.username}</span>
          </button>
        ))}
      </div>
  );
}
