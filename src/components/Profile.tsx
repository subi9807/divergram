import { useEffect, useState } from 'react';
import { Grid2x2 as Grid, Film, Bookmark, Settings, LogOut } from 'lucide-react';
import { db, Profile as ProfileType, Post } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import MasonryGrid from './MasonryGrid';
import PostDetail from './PostDetail';

interface ProfileProps {
  userId?: string;
  onViewPost?: (postId: string) => void;
  onEditProfile?: () => void;
  initialTab?: 'posts' | 'reels' | 'saved';
}

export default function Profile({ userId, onViewPost, onEditProfile, initialTab = 'posts' }: ProfileProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>(initialTab);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const profileId = userId || user?.id;
  const isOwnProfile = profileId === user?.id;

  useEffect(() => {
    if (profileId) {
      loadProfile();
      loadPosts();
      loadReels();
      if (isOwnProfile) {
        loadSavedPosts();
      }
      loadFollowStats();
      checkFollowing();
    }
  }, [profileId]);

  useEffect(() => {
    if (activeTab === 'saved' && isOwnProfile) {
      loadSavedPosts();
    }
  }, [activeTab]);

  const loadProfile = async () => {
    const { data } = await db
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const loadPosts = async () => {
    const { data } = await db
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(id, username, avatar_url),
        likes(id),
        comments(id),
        post_media(id, media_url, media_type, order_index)
      `)
      .eq('user_id', profileId)
      .is('video_url', null)
      .order('created_at', { ascending: false });

    if (data) {
      setPosts(data as Post[]);
    }
    setLoading(false);
  };

  const loadReels = async () => {
    const { data } = await db
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(id, username, avatar_url),
        likes(id),
        comments(id),
        post_media(id, media_url, media_type, order_index)
      `)
      .eq('user_id', profileId)
      .not('video_url', 'is', null)
      .order('created_at', { ascending: false });

    if (data) {
      setReels(data as Post[]);
    }
  };

  const loadSavedPosts = async () => {
    if (!user) return;

    const { data } = await db
      .from('saved_posts')
      .select(`
        post_id,
        posts(
          *,
          profiles!posts_user_id_fkey(id, username, avatar_url),
          likes(id),
          comments(id),
          post_media(id, media_url, media_type, order_index)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const postsData = data.map(item => item.posts).filter(Boolean) as unknown as Post[];
      setSavedPosts(postsData);
    }
  };

  const loadFollowStats = async () => {
    const [followersResult, followingResult] = await Promise.all([
      db.from('follows').select('id', { count: 'exact' }).eq('following_id', profileId),
      db.from('follows').select('id', { count: 'exact' }).eq('follower_id', profileId),
    ]);

    setFollowStats({
      followers: followersResult.count || 0,
      following: followingResult.count || 0,
    });
  };

  const checkFollowing = async () => {
    if (!user || isOwnProfile) return;

    const { data } = await db
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profileId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!user || isOwnProfile) return;

    if (isFollowing) {
      await db
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profileId);
    } else {
      await db.from('follows').insert({
        follower_id: user.id,
        following_id: profileId,
      });
    }

    setIsFollowing(!isFollowing);
    await loadFollowStats();
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
    <div className="w-full px-4 md:px-6 lg:px-8 py-4 md:py-8">
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row items-center md:items-center space-y-6 md:space-y-0 md:space-x-8 mb-6 md:mb-8">
          <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-1 flex-shrink-0">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 font-semibold text-4xl">
                  {(profile.username?.[0] || '?').toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-center space-y-3 md:space-y-0 md:space-x-4 mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-light">{profile.username}</h2>
              {isOwnProfile ? (
                <div className="flex space-x-2">
                  <button
                    onClick={onEditProfile}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200"
                  >
                    <Settings className="h-4 w-4 inline mr-1" />
                    프로필 편집
                  </button>
                  <button
                    onClick={signOut}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-200"
                  >
                    <LogOut className="h-4 w-4 inline mr-1" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={toggleFollow}
                  className={`px-6 py-2 rounded-lg font-semibold text-sm ${
                    isFollowing
                      ? 'bg-gray-200 hover:bg-gray-300'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isFollowing ? '팔로잉' : '팔로우'}
                </button>
              )}
            </div>

            <div className="flex justify-center md:justify-start space-x-6 md:space-x-8 mb-4 md:mb-6 text-sm md:text-base">
              <div>
                <span className="font-semibold">{posts.length}</span> 게시물
              </div>
              <div>
                <span className="font-semibold">{followStats.followers}</span> 팔로워
              </div>
              <div>
                <span className="font-semibold">{followStats.following}</span> 팔로우
              </div>
            </div>

            <div>
              <p className="font-semibold">{profile.full_name}</p>
              {profile.bio && <p className="text-sm mt-1">{profile.bio}</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300 dark:border-gray-700 mt-12">
          <div className="flex justify-center space-x-12">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex flex-col items-center gap-1 py-3 -mt-px ${
                activeTab === 'posts'
                  ? 'border-t border-black dark:border-white text-black dark:text-white'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Grid className="h-4 w-4" />
              <span className="text-[10px] font-semibold tracking-widest">게시물</span>
            </button>
            <button
              onClick={() => setActiveTab('reels')}
              className={`flex flex-col items-center gap-1 py-3 -mt-px ${
                activeTab === 'reels'
                  ? 'border-t border-black dark:border-white text-black dark:text-white'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Film className="h-4 w-4" />
              <span className="text-[10px] font-semibold tracking-widest">릴스</span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex flex-col items-center gap-1 py-3 -mt-px ${
                  activeTab === 'saved'
                    ? 'border-t border-black dark:border-white text-black dark:text-white'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Bookmark className="h-4 w-4" />
                <span className="text-[10px] font-semibold tracking-widest">저장됨</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'posts' && (
        <>
          {posts.length > 0 ? (
            <MasonryGrid
              items={posts.map((post) => {
                const firstMedia = post.post_media && post.post_media.length > 0
                  ? post.post_media.sort((a, b) => a.order_index - b.order_index)[0]
                  : null;
                const displayUrl = firstMedia?.media_url || post.image_url || '';
                const isVideo = firstMedia?.media_type === 'video' || (!firstMedia && !!post.video_url);
                const aspectRatio = 0.6 + Math.random() * 0.8;

                return {
                  id: post.id,
                  url: displayUrl,
                  isVideo,
                  likes: post.likes.length,
                  comments: post.comments.length,
                  aspectRatio,
                };
              })}
              onItemClick={(id) => {
                const post = posts.find(p => p.id === id);
                if (post) setSelectedPost(post);
              }}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">아직 게시물이 없습니다</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'reels' && (
        <>
          {reels.length > 0 ? (
            <MasonryGrid
              items={reels.map((reel) => {
                const firstMedia = reel.post_media && reel.post_media.length > 0
                  ? reel.post_media.sort((a, b) => a.order_index - b.order_index)[0]
                  : null;
                // 릴스는 세로형(9:16) 고정 비율로 노출
                const displayUrl = firstMedia?.media_url || reel.image_url || reel.video_url || '';
                const aspectRatio = 9 / 16;

                return {
                  id: reel.id,
                  url: displayUrl,
                  isVideo: true,
                  likes: reel.likes.length,
                  comments: reel.comments.length,
                  aspectRatio,
                };
              })}
              onItemClick={(id) => {
                const reel = reels.find(r => r.id === id);
                if (reel) setSelectedPost(reel);
              }}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">아직 릴스가 없습니다</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'saved' && isOwnProfile && (
        <>
          {savedPosts.length > 0 ? (
            <MasonryGrid
              items={savedPosts.map((post) => {
                const firstMedia = post.post_media && post.post_media.length > 0
                  ? post.post_media.sort((a, b) => a.order_index - b.order_index)[0]
                  : null;
                const displayUrl = firstMedia?.media_url || post.video_url || post.image_url || '';
                const isVideo = firstMedia?.media_type === 'video' || (!firstMedia && !!post.video_url);
                const aspectRatio = 0.6 + Math.random() * 0.8;

                return {
                  id: post.id,
                  url: displayUrl,
                  isVideo,
                  likes: post.likes.length,
                  comments: post.comments.length,
                  aspectRatio,
                };
              })}
              onItemClick={(id) => {
                const post = savedPosts.find(p => p.id === id);
                if (post) setSelectedPost(post);
              }}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">저장된 게시물이 없습니다</p>
            </div>
          )}
        </>
      )}
    </div>

    {selectedPost && (
      <PostDetail
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onViewProfile={(userId) => {
          setSelectedPost(null);
          if (userId !== profileId) {
            onViewPost?.(userId);
          }
        }}
      />
    )}
    </>
  );
}
