import { useEffect, useState } from 'react';
import { Grid2x2 as Grid, Film, Bookmark, Settings, LogOut, Award, TrendingUp, ShieldCheck } from 'lucide-react';
import { db, Profile as ProfileType, Post } from '../lib/internal-db';
import { getProfileBadges } from '../lib/profileBadges';
import { useAuth } from '../contexts/AuthContext';
import MasonryGrid from './MasonryGrid';
import PostDetail from './PostDetail';

const diveBadgeMilestones = [1, 10, 50, 100, 200, 500, 1000];

function numericProfileField(profile: ProfileType, keys: string[]) {
  const source = profile as ProfileType & Record<string, unknown>;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function getDiveCount(profile: ProfileType, postsCount: number, reelsCount: number) {
  return numericProfileField(profile, ['dive_count', 'diving_count', 'dives_count', 'logged_dives']) || postsCount + reelsCount;
}

function getNextDiveMilestone(diveCount: number) {
  const next = diveBadgeMilestones.find((milestone) => diveCount < milestone);
  if (!next) return null;
  const previous = [...diveBadgeMilestones].reverse().find((milestone) => milestone <= diveCount) || 0;
  const progress = next === 1 ? Math.min(diveCount, 1) : Math.max(0, Math.min(100, ((diveCount - previous) / (next - previous)) * 100));
  return { next, remaining: next - diveCount, progress };
}

function getLicenseSummary(profile: ProfileType) {
  if (!profile.license_type) return null;
  const parts = [profile.license_agency, profile.license_type].filter(Boolean);
  return {
    title: parts.join(' · ') || profile.license_type,
    detail: [profile.license_number ? `No. ${profile.license_number}` : '', profile.license_issued_at ? `취득 ${profile.license_issued_at}` : ''].filter(Boolean).join(' · '),
  };
}

function getLatestDiveDate(posts: Post[]) {
  const latest = posts
    .map((post) => post.dive_date || post.created_at)
    .filter(Boolean)
    .sort()
    .pop();
  if (!latest) return '-';
  return new Date(latest).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function getMaxDepth(posts: Post[]) {
  return posts.reduce((max, post) => Math.max(max, Number(post.max_depth || 0)), 0);
}

interface ProfileProps {
  userId?: string;
  onViewPost?: (postId: string) => void;
  onViewProfile?: (userId: string) => void;
  onEditProfile?: () => void;
  initialTab?: 'posts' | 'reels' | 'saved';
}

export default function Profile({ userId, onViewPost, onViewProfile, onEditProfile, initialTab = 'posts' }: ProfileProps) {
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
  const profileBadges = profile
    ? getProfileBadges({
        profile,
        postsCount: posts.length,
        reelsCount: reels.length,
        followersCount: followStats.followers,
        followingCount: followStats.following,
      })
    : [];
  const allDivePosts = [...posts, ...reels];
  const diveCount = profile ? getDiveCount(profile, posts.length, reels.length) : 0;
  const nextDiveBadge = getNextDiveMilestone(diveCount);
  const maxDepth = getMaxDepth(allDivePosts);
  const latestDiveDate = getLatestDiveDate(allDivePosts);
  const accountLabel = profile?.account_type === 'resort' ? '다이빙 리조트' : '개인 다이버';
  const accountTone = profile?.account_type === 'resort'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800'
    : 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800';
  const heroBadges = profileBadges.slice(0, 3);
  const visibleBadges = profileBadges.slice(0, 6);
  const hiddenBadgeCount = Math.max(0, profileBadges.length - visibleBadges.length);
  const hasDiveActivity = diveCount > 0 || maxDepth > 0 || latestDiveDate !== '-';
  const licenseSummary = profile ? getLicenseSummary(profile) : null;

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
    <div className="w-full px-4 md:px-2 lg:px-0 py-4 md:py-8 text-gray-900 dark:text-gray-100">
      <div className="mb-8 md:mb-12">
        <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
            <div className="flex flex-col items-center md:w-44 md:flex-shrink-0">
              <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-500 p-1 md:h-36 md:w-36">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-gray-950">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-gray-600 dark:text-gray-300">
                      {(profile.username?.[0] || '?').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <span className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${accountTone}`}>
                {accountLabel}
              </span>
            </div>

            <div className="min-w-0 flex-1 text-center md:text-left">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-bold tracking-tight text-gray-950 dark:text-white">{profile.username}</h2>
                  {profile.full_name && (
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">{profile.full_name}</p>
                  )}
                </div>

                {isOwnProfile ? (
                  <div className="flex flex-wrap justify-center gap-2 md:justify-end">
                    <button
                      onClick={onEditProfile}
                      className="inline-flex h-9 items-center rounded-xl border border-gray-300 px-3 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <Settings className="mr-1.5 h-4 w-4" />
                      편집
                    </button>
                    <button
                      onClick={signOut}
                      className="inline-flex h-9 items-center rounded-xl border border-gray-300 px-3 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <LogOut className="mr-1.5 h-4 w-4" />
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={toggleFollow}
                    className={`h-9 rounded-xl px-5 text-sm font-semibold transition ${
                      isFollowing
                        ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isFollowing ? '팔로잉' : '팔로우'}
                  </button>
                )}
              </div>

              {heroBadges.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                  {heroBadges.map((badge) => (
                    <span
                      key={`hero-${badge.id}`}
                      title={badge.description}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                    >
                      <span aria-hidden="true">{badge.icon}</span>
                      {badge.label}
                    </span>
                  ))}
                </div>
              )}

              {profile.bio && (
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">{profile.bio}</p>
              )}

              <div className="mt-5 grid grid-cols-3 gap-2 text-center md:max-w-lg">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/70">
                  <div className="text-xl font-bold text-gray-950 dark:text-white">{formatNumber(posts.length + reels.length)}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">기록</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/70">
                  <div className="text-xl font-bold text-gray-950 dark:text-white">{formatNumber(followStats.followers)}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">팔로워</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/70">
                  <div className="text-xl font-bold text-gray-950 dark:text-white">{formatNumber(followStats.following)}</div>
                  <div className="mt-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">팔로우</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">다이빙 요약</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {hasDiveActivity
                      ? `${formatNumber(diveCount)}회 · 최대 ${maxDepth > 0 ? `${maxDepth}m` : '미기록'} · 최근 ${latestDiveDate === '-' ? '미기록' : latestDiveDate}`
                      : '아직 공개된 다이빙 기록이 없어요.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">라이센스</h3>
                  {licenseSummary ? (
                    <>
                      <p className="mt-1 truncate text-sm font-semibold text-gray-700 dark:text-gray-200">{licenseSummary.title}</p>
                      {licenseSummary.detail && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{licenseSummary.detail}</p>}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">등록된 라이센스가 없어요.</p>
                  )}
                </div>
              </div>
            </div>

            {nextDiveBadge && (
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40 lg:col-span-2">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    <TrendingUp className="h-4 w-4 text-cyan-500" />
                    다음 목표: {formatNumber(nextDiveBadge.next)}회 다이빙
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatNumber(nextDiveBadge.remaining)}회 남음 · {Math.round(nextDiveBadge.progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all"
                    style={{ width: `${nextDiveBadge.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {profileBadges.length > 0 && (
            <div className="mt-5 rounded-3xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">획득 뱃지</h3>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">총 {formatNumber(profileBadges.length)}개</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleBadges.map((badge) => (
                  <div
                    key={badge.id}
                    title={badge.description}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${badge.className}`}
                  >
                    <span aria-hidden="true" className="text-sm">{badge.icon}</span>
                    <span>{badge.label}</span>
                  </div>
                ))}
                {hiddenBadgeCount > 0 && (
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                    +{hiddenBadgeCount}개 더
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="border-t border-gray-200 dark:border-gray-700 mt-10">
          <div className="flex justify-center space-x-10">
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
                // 릴스는 세로형(4:6) 고정 비율로 노출
                const displayUrl = firstMedia?.media_url || reel.image_url || reel.video_url || '';
                const aspectRatio = 4 / 6;

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
            onViewProfile?.(userId);
          }
        }}
      />
    )}
    </>
  );
}
