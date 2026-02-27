import { useEffect, useState, useRef } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Volume2, VolumeX } from 'lucide-react';
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
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const newIndex = Math.round(scrollPosition / windowHeight);

      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < posts.length) {
        setCurrentIndex(newIndex);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex justify-center w-full items-center h-screen bg-white dark:bg-zinc-900">
        <div className="text-center text-white">
          <p className="text-lg">릴스가 없습니다</p>
          <p className="text-sm text-gray-400 mt-2">비디오 콘텐츠를 올려보세요</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="snap-y snap-mandatory h-screen bg-white dark:bg-zinc-900">
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
              className="snap-start snap-always h-screen w-full relative items-center justify-center"
            >
              <div className="w-full max-w-[630px] h-full relative flex items-center justify-center mx-auto bg-gray-100 dark:bg-zinc-900 ring-1 ring-black/5 dark:ring-white/10">
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
                    className="w-full h-full object-contain"
                    loop
                    muted={isMuted}
                    playsInline
                  />
                );
              })()}

              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onViewProfile(post.user_id)}
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5"
                  >
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      {author.avatar_url ? (
                        <img
                          src={author.avatar_url}
                          alt={author.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-semibold text-sm">
                          {(author.username?.[0] || '?').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => onViewProfile(post.user_id)}
                    className="text-white font-semibold text-sm drop-shadow-lg"
                  >
                    {author.username}
                  </button>
                  {user?.id !== post.user_id && (
                    <button
                      onClick={(e) => handleFollow(post.user_id, e)}
                      className={`px-3 py-1 border rounded-lg text-sm font-semibold transition ${
                        isFollowing
                          ? 'bg-gray-200 border-gray-300 text-gray-800 hover:bg-gray-300'
                          : 'bg-transparent border-white text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      {isFollowing ? '팔로잉' : '팔로우'}
                    </button>
                  )}
                </div>
                <button
                  onClick={(e) => handleMoreClick(post, e)}
                  className="text-white"
                >
                  <MoreHorizontal className="h-6 w-6 drop-shadow-lg" />
                </button>
              </div>

              <div className="absolute bottom-20 left-4 right-20 z-10">
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

              <div className="absolute bottom-20 right-4 flex flex-col items-center space-y-6 z-10">
                <button
                  onClick={(e) => toggleMute(e)}
                  className="flex flex-col items-center"
                >
                  {isMuted ? (
                    <VolumeX className="h-7 w-7 text-white drop-shadow-lg" />
                  ) : (
                    <Volume2 className="h-7 w-7 text-white drop-shadow-lg" />
                  )}
                </button>

                <button
                  onClick={(e) => toggleLike(post.id, e)}
                  className="flex flex-col items-center"
                >
                  <Heart
                    className={`h-8 w-8 drop-shadow-lg ${
                      isLiked ? 'fill-red-500 text-red-500' : 'text-white'
                    }`}
                  />
                  <span className="text-white text-xs font-semibold mt-1 drop-shadow-lg">
                    {likeCount}
                  </span>
                </button>

                <button
                  onClick={(e) => handleCommentClick(post, e)}
                  className="flex flex-col items-center"
                >
                  <MessageCircle className="h-8 w-8 text-white drop-shadow-lg" />
                  <span className="text-white text-xs font-semibold mt-1 drop-shadow-lg">
                    {commentCount}
                  </span>
                </button>

                <button
                  onClick={(e) => handleShare(post, e)}
                  className="flex flex-col items-center"
                >
                  <Send className="h-8 w-8 text-white drop-shadow-lg" />
                </button>

                <button
                  onClick={(e) => toggleSave(post.id, e)}
                  className="flex flex-col items-center"
                >
                  <Bookmark
                    className={`h-8 w-8 drop-shadow-lg ${
                      isSaved ? 'fill-yellow-400 text-yellow-400' : 'text-white'
                    }`}
                  />
                </button>
              </div>
              </div>
            </div>
          );
        })}
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
