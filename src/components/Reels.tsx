import { useEffect, useState, useRef } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Volume2, VolumeX, ChevronUp, ChevronDown } from 'lucide-react';
import { db, Post } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import { getVideoInfo } from '../utils/videoUtils';
import PostOptionsModal from './PostOptionsModal';
import PostDetail from './PostDetail';
import ShareModal from './ShareModal';

interface ReelsProps {
  onViewProfile: (userId: string) => void;
}

export default function Reels({ onViewProfile }: ReelsProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const isWheelLockedRef = useRef(false);

  useEffect(() => {
    loadPosts();
    if (user) {
      loadFollowingUsers();
      loadSavedPosts();
    }
  }, [user]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex]);

  useEffect(() => {
    const handleScroll = () => {
      const newIndex = Math.floor((window.scrollY + window.innerHeight * 0.15) / window.innerHeight);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < posts.length) {
        setCurrentIndex(newIndex);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (posts.length <= 1 || isWheelLockedRef.current || e.deltaY === 0) return;
      e.preventDefault();

      const direction = e.deltaY > 0 ? 1 : -1;
      const nextIndex = Math.max(0, Math.min(posts.length - 1, currentIndex + direction));
      if (nextIndex === currentIndex) return;

      isWheelLockedRef.current = true;
      setCurrentIndex(nextIndex);
      window.scrollTo({ top: nextIndex * window.innerHeight, behavior: 'smooth' });

      window.setTimeout(() => {
        isWheelLockedRef.current = false;
      }, 380);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [currentIndex, posts.length]);

  const loadPosts = async () => {
    const { data } = await db
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(id, username, avatar_url, full_name),
        likes(id, user_id),
        comments(id),
        post_media(id, media_url, media_type, order_index)
      `)
      .not('video_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setPosts(data as Post[]);
    }
    setLoading(false);
  };

  const loadFollowingUsers = async () => {
    if (!user) return;

    const { data } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (data) {
      setFollowingUsers(new Set(data.map(f => f.following_id)));
    }
  };

  const loadSavedPosts = async () => {
    if (!user) return;

    const { data } = await db
      .from('saved_posts')
      .select('post_id')
      .eq('user_id', user.id);

    if (data) {
      setSavedPosts(new Set(data.map(s => s.post_id)));
    }
  };

  const toggleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.some((like: any) => like.user_id === user.id);

    if (isLiked) {
      await db
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
    } else {
      await db.from('likes').insert({ post_id: postId, user_id: user.id });

      if (post.user_id !== user.id) {
        await db.from('notifications').insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: 'like',
          post_id: postId,
        });
      }
    }

    await loadPosts();
  };

  const handleMoreClick = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPost(post);
    setShowOptionsModal(true);
  };

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const isFollowing = followingUsers.has(userId);

    if (isFollowing) {
      await db
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      const newFollowing = new Set(followingUsers);
      newFollowing.delete(userId);
      setFollowingUsers(newFollowing);
    } else {
      await db
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });

      await db.from('notifications').insert({
        user_id: userId,
        actor_id: user.id,
        type: 'follow',
      });

      const newFollowing = new Set(followingUsers);
      newFollowing.add(userId);
      setFollowingUsers(newFollowing);
    }
  };

  const toggleSave = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const isSaved = savedPosts.has(postId);

    if (isSaved) {
      await db
        .from('saved_posts')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      const newSaved = new Set(savedPosts);
      newSaved.delete(postId);
      setSavedPosts(newSaved);
    } else {
      await db
        .from('saved_posts')
        .insert({ user_id: user.id, post_id: postId });

      const newSaved = new Set(savedPosts);
      newSaved.add(postId);
      setSavedPosts(newSaved);
    }
  };

  const handleCommentClick = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPost(post);
    setShowPostDetail(true);
  };

  const handleShare = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPost(post);
    setShowShareModal(true);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    videoRefs.current.forEach(video => {
      if (video) {
        video.muted = !isMuted;
      }
    });
  };

  const goToIndex = (targetIndex: number) => {
    const nextIndex = Math.max(0, Math.min(posts.length - 1, targetIndex));
    if (nextIndex === currentIndex) return;

    isWheelLockedRef.current = true;
    setCurrentIndex(nextIndex);
    window.scrollTo({ top: nextIndex * window.innerHeight, behavior: 'smooth' });

    window.setTimeout(() => {
      isWheelLockedRef.current = false;
    }, 380);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex justify-center w-full items-center h-screen bg-gray-50 dark:bg-black">
        <div className="text-center text-gray-900 dark:text-white">
          <p className="text-lg">릴스가 없습니다</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">비디오 콘텐츠를 올려보세요</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="snap-y snap-mandatory">
        {posts.map((post, index) => {
          const likes = Array.isArray(post.likes) ? post.likes : [];
          const comments = Array.isArray(post.comments) ? post.comments : [];
          const media = Array.isArray(post.post_media) ? post.post_media : [];
          const author = post.profiles || { username: 'unknown', avatar_url: '' };

          const isLiked = likes.some((like: any) => like?.user_id === user?.id);
          const likeCount = likes.length;
          const commentCount = comments.length;
          const isFollowing = followingUsers.has(post.user_id);
          const isSaved = savedPosts.has(post.id);

          const firstVideoMedia = media.length > 0
            ? media.find(m => m.media_type === 'video')
            : null;
          const videoUrl = firstVideoMedia?.media_url || post.video_url || '';

          return (
            <div
              key={post.id}
              className="snap-start snap-always h-screen w-full relative flex items-center justify-center py-2"
            >
              <div className="w-full max-w-[492px] h-[calc(100vh-34px)] relative mx-auto">
              <div className="w-full h-full relative overflow-hidden rounded-2xl">
              {(() => {
                const videoInfo = getVideoInfo(videoUrl);
                if (videoInfo.type === 'youtube' || videoInfo.type === 'vimeo') {
                  return (
                    <iframe
                      src={videoInfo.embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      style={{ border: 'none' }}
                    />
                  );
                }
                return (
                  <video
                    ref={(el) => (videoRefs.current[index] = el)}
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    loop
                    muted={isMuted}
                    playsInline
                    preload="auto"
                  />
                );
              })()}

              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onViewProfile(post.user_id)}
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5"
                  >
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      {author.avatar_url ? (
                        <img src={author.avatar_url} alt={author.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-gray-600 font-semibold text-sm">{(author.username?.[0] || '?').toUpperCase()}</span>
                      )}
                    </div>
                  </button>
                  <button onClick={() => onViewProfile(post.user_id)} className="text-white font-semibold text-sm drop-shadow-lg">
                    {author.username}
                  </button>
                  {user?.id !== post.user_id && (
                    <button
                      onClick={(e) => handleFollow(post.user_id, e)}
                      className={`px-3 py-1 border rounded-lg text-xs font-semibold transition ${
                        isFollowing ? 'bg-gray-200/95 dark:bg-gray-200 border-gray-300 text-gray-800 hover:bg-gray-300' : 'bg-white/15 dark:bg-transparent border-white text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      {isFollowing ? '팔로잉' : '팔로우'}
                    </button>
                  )}
                </div>
                <button onClick={(e) => toggleMute(e)} className="text-white bg-black/45 dark:bg-black/40 rounded-full p-2 ring-1 ring-white/20">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>

              <div className="absolute bottom-20 left-4 right-4 z-10">
                <button
                  onClick={() => onViewProfile(post.user_id)}
                  className="text-white font-semibold text-sm mb-2 drop-shadow-lg hover:underline"
                >
                  {author.username}
                </button>
                {post.caption && (
                  <p className="text-white text-sm drop-shadow-lg line-clamp-2">
                    {post.caption}
                  </p>
                )}
                {post.location && (
                  <p className="text-white text-xs mt-1 drop-shadow-lg opacity-90">
                    📍 {post.location}
                  </p>
                )}
              </div>
              </div>

              <div className="absolute bottom-14 right-2 md:right-[-56px] flex flex-col items-center space-y-3 z-20">
                <button onClick={(e) => toggleLike(post.id, e)} className="flex flex-col items-center text-black">
                  <span className="w-9 h-9 rounded-full bg-white/92 flex items-center justify-center ring-1 ring-black/10">
                    <Heart
                      className={`h-6 w-6 drop-shadow-sm ${
                        isLiked ? 'fill-red-500 text-red-500' : 'text-black'
                      }`}
                    />
                  </span>
                  <span className="text-black text-[11px] font-medium mt-0.5">
                    {likeCount}
                  </span>
                </button>

                <button
                  onClick={(e) => handleCommentClick(post, e)}
                  className="flex flex-col items-center text-black"
                >
                  <span className="w-9 h-9 rounded-full bg-white/92 flex items-center justify-center ring-1 ring-black/10">
                    <MessageCircle className="h-6 w-6 text-black drop-shadow-sm" />
                  </span>
                  <span className="text-black text-[11px] font-medium mt-0.5">
                    {commentCount}
                  </span>
                </button>

                <button
                  onClick={(e) => handleShare(post, e)}
                  className="flex flex-col items-center text-black"
                >
                  <span className="w-9 h-9 rounded-full bg-white/92 flex items-center justify-center ring-1 ring-black/10">
                    <Send className="h-6 w-6 text-black drop-shadow-sm" />
                  </span>
                </button>

                <button
                  onClick={(e) => toggleSave(post.id, e)}
                  className="flex flex-col items-center text-black"
                >
                  <span className="w-9 h-9 rounded-full bg-white/92 flex items-center justify-center ring-1 ring-black/10">
                    <Bookmark
                      className={`h-6 w-6 drop-shadow-sm ${
                        isSaved ? 'fill-yellow-400 text-yellow-500' : 'text-black'
                      }`}
                    />
                  </span>
                </button>

                <button onClick={(e) => handleMoreClick(post, e)} className="flex flex-col items-center text-black">
                  <span className="w-9 h-9 rounded-full bg-white/92 flex items-center justify-center ring-1 ring-black/10">
                    <MoreHorizontal className="h-6 w-6 text-black drop-shadow-sm" />
                  </span>
                </button>

                <button onClick={() => onViewProfile(post.user_id)} className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-black/10">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt={author.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white text-black text-xs font-bold flex items-center justify-center">♫</div>
                  )}
                </button>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-30 flex-col gap-3">
        <button
          onClick={() => goToIndex(currentIndex - 1)}
          disabled={currentIndex <= 0}
          className="w-10 h-10 rounded-full bg-black/60 text-white ring-1 ring-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="이전 릴스로 이동"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={() => goToIndex(currentIndex + 1)}
          disabled={currentIndex >= posts.length - 1}
          className="w-10 h-10 rounded-full bg-black/60 text-white ring-1 ring-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="다음 릴스로 이동"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {showOptionsModal && selectedPost && (
        <PostOptionsModal
          isOpen={showOptionsModal}
          onClose={() => {
            setShowOptionsModal(false);
            setSelectedPost(null);
          }}
          onReport={() => alert('신고 기능은 준비중입니다')}
          onFollow={() => {}}
          onFavorite={() => {}}
          onShare={() => setShowShareModal(true)}
          onCopyLink={() => {}}
          onEmbed={() => {}}
          onGoToPost={() => setShowPostDetail(true)}
          onAboutAccount={() => onViewProfile(selectedPost.user_id)}
          onDelete={async () => {
            await db.from('posts').delete().eq('id', selectedPost.id);
            setShowOptionsModal(false);
            setSelectedPost(null);
            await loadPosts();
          }}
          isFollowing={false}
          isOwnPost={selectedPost.user_id === user?.id}
        />
      )}

      {showPostDetail && selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => {
            setShowPostDetail(false);
            setSelectedPost(null);
            loadPosts();
          }}
          onViewProfile={onViewProfile}
        />
      )}

      {showShareModal && selectedPost && (
        <ShareModal
          post={selectedPost}
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedPost(null);
          }}
        />
      )}
    </>
  );
}
