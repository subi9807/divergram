import { useEffect, useState, useRef } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin, Waves, Gauge, Thermometer, Clock, Eye, Users } from 'lucide-react';
import { db, Post } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';

import { getVideoInfo } from '../utils/videoUtils';
import PostOptionsModal from './PostOptionsModal';
import PostDetail from './PostDetail';
import ShareModal from './ShareModal';
import Stories from './Stories';
import { renderTextWithMentions } from './MentionInput';
import EditPostModal from './EditPostModal';
import MediaCarousel from './MediaCarousel';
import DeleteConfirmModal from './DeleteConfirmModal';

interface FeedProps {
  onViewProfile: (userId: string) => void;
  onViewLocation?: (location: string) => void;
  selectedPostId?: string;
  singlePostMode?: boolean;
}

export default function Feed({ onViewProfile, onViewLocation, selectedPostId: initialSelectedPostId, singlePostMode = false }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [viewPost, setViewPost] = useState<Post | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [page, setPage] = useState(1);
  const POSTS_PER_PAGE = 12;
  const { user } = useAuth();

  const formatFeedTime = (createdAt: string) => {
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return '방금작성';
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간전`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}일전`;
  };
  const moreButtonRefs = useRef<Record<string, HTMLButtonElement>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [buddyProfileMap, setBuddyProfileMap] = useState<Record<string, string>>({});

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 1800);
  };

  const goToLocationPage = (location: string) => {
    if (!location) return;
    if (onViewLocation) {
      onViewLocation(location);
      return;
    }
    window.history.pushState({}, '', `/location/${encodeURIComponent(location)}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    loadPosts();
    if (user) {
      loadFollowingUsers();
      loadSavedPosts();
    }
  }, [user]);


  useEffect(() => {
    if (!singlePostMode || !initialSelectedPostId || posts.length === 0) return;
    const target = posts.find((p) => p.id === initialSelectedPostId);
    if (target) setViewPost(target);
  }, [singlePostMode, initialSelectedPostId, posts]);

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [posts, displayedPosts, page, loadingMore]);


  useEffect(() => {
    const pauseOtherVideos = (current: HTMLVideoElement) => {
      document.querySelectorAll('video').forEach((el) => {
        const v = el as HTMLVideoElement;
        if (v !== current) v.pause();
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            pauseOtherVideos(video);
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0, 0.3, 0.7, 1] }
    );

    const videos = Array.from(document.querySelectorAll('video[data-feed-video="true"]')) as HTMLVideoElement[];
    videos.forEach((v) => observer.observe(v));

    return () => {
      observer.disconnect();
      videos.forEach((v) => v.pause());
    };
  }, [displayedPosts]);

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
      setSavedPosts(new Set(data.map(s => String(s.post_id))));
    }
  };

  const loadPosts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: followingData } = await db
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = followingData?.map(f => f.following_id) || [];
    const userIds = [user.id, ...followingIds];

    const { data } = await db
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(id, username, avatar_url, full_name),
        likes(id, user_id),
        comments(id),
        post_media(id, media_url, media_type, order_index)
      `)
      .in('user_id', userIds)
      .is('video_url', null)
      .order('created_at', { ascending: false });

    let loadedPosts = (data || []) as Post[];

    // 홈 피드 추천(팔로우/본인)이 비어있으면, 최신 게시물부터 fallback 노출
    if (loadedPosts.length === 0) {
      const { data: recentData } = await db
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey(id, username, avatar_url, full_name),
          likes(id, user_id),
          comments(id),
          post_media(id, media_url, media_type, order_index)
        `)
        .is('video_url', null)
        .order('created_at', { ascending: false });

      loadedPosts = (recentData || []) as Post[];
    }

    setPosts(loadedPosts);
    setDisplayedPosts(loadedPosts.slice(0, POSTS_PER_PAGE));
    setPage(1);

    const buddyNames = Array.from(new Set(
      loadedPosts
        .flatMap((p) => (p.buddy_name || '').split(',').map((v) => v.trim()).filter(Boolean))
    ));

    if (buddyNames.length) {
      const { data: buddyProfiles } = await db
        .from('profiles')
        .select('id, username')
        .in('username', buddyNames);

      const nextMap: Record<string, string> = {};
      (buddyProfiles || []).forEach((p: any) => {
        nextMap[p.username] = String(p.id);
      });
      setBuddyProfileMap(nextMap);
    } else {
      setBuddyProfileMap({});
    }
    setLoading(false);
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const isLiked = post.likes.some((like: any) => like.user_id === user.id);

    // optimistic update: 전체 피드 재조회 없이 즉시 반영
    const nextPosts = posts.map((p: any) => {
      if (p.id !== postId) return p;
      const likes = Array.isArray(p.likes) ? p.likes : [];
      return {
        ...p,
        likes: isLiked
          ? likes.filter((l: any) => l.user_id !== user.id)
          : [...likes, { id: `tmp_${Date.now()}`, user_id: user.id }],
      };
    });
    setPosts(nextPosts as Post[]);
    setDisplayedPosts((nextPosts as Post[]).slice(0, page * POSTS_PER_PAGE));

    try {
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
    } catch {
      // 실패 시 서버 상태 재동기화
      await loadPosts();
    }
  };

  const toggleSave = async (postId: string) => {
    if (!user) return;

    const pid = String(postId);
    const isSaved = savedPosts.has(pid);

    if (isSaved) {
      await db
        .from('saved_posts')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', pid);

      const newSaved = new Set(savedPosts);
      newSaved.delete(pid);
      setSavedPosts(newSaved);
    } else {
      await db
        .from('saved_posts')
        .insert({ user_id: user.id, post_id: pid });

      const newSaved = new Set(savedPosts);
      newSaved.add(pid);
      setSavedPosts(newSaved);
    }
  };

  const handleShare = (post: Post) => {
    setSelectedPost(post);
    setShowShareModal(true);
  };

  const handleMoreClick = (post: Post) => {
    setSelectedPost(post);
    setShowOptionsModal(true);
    setShowEditModal(false);
    setShowShareModal(false);
  };

  const handleFollowAction = async () => {
    if (!user || !selectedPost) return;

    const isFollowing = followingUsers.has(selectedPost.user_id);

    if (isFollowing) {
      await db
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', selectedPost.user_id);

      const newFollowing = new Set(followingUsers);
      newFollowing.delete(selectedPost.user_id);
      setFollowingUsers(newFollowing);
    } else {
      await db
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: selectedPost.user_id,
        });

      await db.from('notifications').insert({
        user_id: selectedPost.user_id,
        actor_id: user.id,
        type: 'follow',
      });

      const newFollowing = new Set(followingUsers);
      newFollowing.add(selectedPost.user_id);
      setFollowingUsers(newFollowing);
    }
  };

  const handleCopyLink = () => {
    if (!selectedPost) return;
    const url = `${window.location.origin}/post/${selectedPost.id}`;
    navigator.clipboard.writeText(url);
    showToast('링크가 복사되었습니다');
  };

  const handleEmbed = () => {
    if (!selectedPost) return;

    const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${window.location.origin}/post/${selectedPost.id}/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="${window.location.origin}/post/${selectedPost.id}/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">Instagram에서 이 게시물 보기</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="${window.location.origin}/post/${selectedPost.id}/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">${selectedPost.profiles.username}(@${selectedPost.profiles.username})님의 공유 게시물</a></p></div></blockquote>
<script async src="//www.instagram.com/embed.js"></script>`;

    navigator.clipboard.writeText(embedCode);
    showToast('퍼가기 코드가 복사되었습니다');
  };

  const handleEditPost = async (updatedData: Partial<Post>) => {
    if (!selectedPost || !user) return;

    await db
      .from('posts')
      .update(updatedData)
      .eq('id', selectedPost.id);

    const updatedPosts = posts.map(p =>
      p.id === selectedPost.id ? { ...p, ...updatedData } : p
    );
    setPosts(updatedPosts);
    setDisplayedPosts(updatedPosts.slice(0, page * POSTS_PER_PAGE));
    setSelectedPost({ ...selectedPost, ...updatedData });

    await loadPosts();
  };

  const handleDeletePost = async () => {
    if (!selectedPost || !user) {
      return;
    }

    setDeleting(true);
    const postId = selectedPost.id;

    try {
      const { data, error: deleteError } = await db
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id)
        .select();

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      if (!data || data.length === 0) {
        throw new Error('삭제할 게시물을 찾을 수 없습니다. 권한을 확인해주세요.');
      }

      const updatedPosts = posts.filter(p => p.id !== postId);
      setPosts(updatedPosts);
      setDisplayedPosts(updatedPosts.slice(0, page * POSTS_PER_PAGE));

      setShowDeleteModal(false);
      setShowOptionsModal(false);
      setSelectedPost(null);
      showToast('게시물이 삭제되었습니다.');

    } catch (error: any) {
      console.error('Error deleting post:', error);
      showToast(`게시물 삭제 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    if (user) {
      await loadFollowingUsers();
      await loadSavedPosts();
    }
    setRefreshing(false);
  };

  const loadMorePosts = () => {
    if (loadingMore || displayedPosts.length >= posts.length) return;

    setLoadingMore(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const newPosts = posts.slice(0, nextPage * POSTS_PER_PAGE);
      setDisplayedPosts(newPosts);
      setPage(nextPage);
      setLoadingMore(false);
    }, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY === 0) return;

    if (window.scrollY > 0) {
      setPullStartY(0);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;

    if (distance > 0 && distance < 150) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80) {
      handleRefresh();
    }
    setPullStartY(0);
    setPullDistance(0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const postsToRender = singlePostMode && initialSelectedPostId
    ? posts.filter((p) => p.id === initialSelectedPostId)
    : displayedPosts;

  if (singlePostMode) {
    const targetPost = viewPost || postsToRender[0] || null;
    if (!targetPost) {
      return (
        <div className="flex justify-center items-center h-96 text-gray-500">게시물을 찾을 수 없습니다.</div>
      );
    }

    return (
      <PostDetail
        post={targetPost}
        onClose={() => {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        onViewProfile={onViewProfile}
        inline={true}
      />
    );
  }

  return (
    <>
    <div
      className="w-full max-w-full px-2.5 md:px-4 py-2 md:py-10 box-border max-w-[630px] mx-auto text-gray-900 dark:text-gray-100"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateY(${pullDistance}px)` }}
    >
      {(refreshing || pullDistance > 0) && (
        <div
          className="flex justify-center items-center py-4"
          style={{
            opacity: pullDistance > 0 ? Math.min(pullDistance / 80, 1) : 1
          }}
        >
          {refreshing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          ) : (
            <div className="text-gray-500 text-sm">
              {pullDistance > 80 ? '놓아서 새로고침' : '아래로 당겨 새로고침'}
            </div>
          )}
        </div>
      )}

      <div className="mb-6 md:mb-8">
        <Stories onUserSelect={onViewProfile} />
      </div>

      <div className="space-y-3 md:space-y-8 max-w-[470px] mx-auto">
        {postsToRender.map((post) => {
          const isLiked = post.likes.some((like: any) => like.user_id === user?.id);
          const likeCount = post.likes.length;
          const commentCount = post.comments.length;

          return (
            <div key={post.id} className="bg-white dark:bg-[#121212] transition-colors">
              <div className="flex items-center justify-between px-3 py-3.5">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onViewProfile(post.user_id)}
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5"
                  >
                    <div className="w-full h-full rounded-full bg-white dark:bg-[#121212] flex items-center justify-center transition-colors">
                      {post.profiles.avatar_url ? (
                        <img
                          src={post.profiles.avatar_url}
                          alt={post.profiles.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400 font-semibold">
                          {post.profiles.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </button>
                  <div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewProfile(post.user_id)}
                        className="font-semibold text-sm hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
                      >
                        {post.profiles.username}
                      </button>
                      {((post.buddy_name || '').split(',').map((v) => v.trim()).filter(Boolean).length > 0) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          외 {(post.buddy_name || '').split(',').map((v) => v.trim()).filter(Boolean).length}명
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatFeedTime(post.created_at)}</p>
                    </div>
                    {post.location && (
                      <button
                        onClick={() => goToLocationPage(post.location!)}
                        className="text-xs text-gray-600 dark:text-gray-400 flex items-center hover:text-gray-900 dark:hover:text-gray-200"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {post.location}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  ref={(el) => {
                    if (el) moreButtonRefs.current[post.id] = el;
                  }}
                  onClick={() => handleMoreClick(post)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-900 p-2 rounded-full dark:text-white"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              <div className="w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '3 / 4' }}>
                {post.post_media && post.post_media.length > 0 ? (
                  <MediaCarousel
                    media={post.post_media}
                    className="w-full h-full"
                    style={{ height: '100%' }}
                  />
                ) : post.video_url ? (
                  (() => {
                    const videoInfo = getVideoInfo(post.video_url);
                    if (videoInfo.type === 'youtube' || videoInfo.type === 'vimeo') {
                      return (
                        <div className="relative w-full h-full">
                          <iframe
                            src={videoInfo.embedUrl}
                            className="absolute top-0 left-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Video player"
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="w-full h-full bg-gradient-to-b from-black/70 via-black/85 to-black/70">
                        <video
                          src={post.video_url}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                          data-feed-video="true"
                          onPlay={(e) => {
                            const current = e.currentTarget as HTMLVideoElement;
                            document.querySelectorAll('video').forEach((el) => {
                              const v = el as HTMLVideoElement;
                              if (v !== current) v.pause();
                            });
                          }}
                        />
                      </div>
                    );
                  })()
                ) : post.image_url ? (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>

              <div className="px-3 py-3.5 space-y-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleLike(post.id)}
                      className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300 transition-colors inline-flex items-center gap-1"
                    >
                      <Heart
                        className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                        strokeWidth={2.1}
                      />
                      <span className="text-xs font-medium">{likeCount}</span>
                    </button>
                    <button
                      onClick={() => {
                        window.history.pushState({}, '', `/post?post=${post.id}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300 inline-flex items-center gap-1"
                    >
                      <MessageCircle className="h-6 w-6" strokeWidth={2.1} />
                      <span className="text-xs font-medium">{commentCount}</span>
                    </button>
                    <button
                      onClick={() => handleShare(post)}
                      className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300"
                      aria-label="공유"
                      title="공유"
                    >
                      <Send className="h-6 w-6" strokeWidth={2.1} />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleSave(post.id)}
                    className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300 transition-colors"
                  >
                    <Bookmark
                      className={`h-6 w-6 ${
                        savedPosts.has(String(post.id)) ? 'fill-yellow-400 text-yellow-400' : ''
                      }`}
                      strokeWidth={2.1}
                    />
                  </button>
                </div>


                {(() => {
                  const hasDiveData = Boolean(
                    post.dive_type || post.dive_site || post.max_depth != null || post.water_temperature != null ||
                    post.dive_duration != null || post.visibility != null || post.buddy_name || post.dive_date || post.location
                  );
                  if (!hasDiveData) return null;

                  return (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-3 space-y-2 -mt-1 transition-colors">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                        <Waves className="h-4 w-4" />
                        {post.dive_type ? (post.dive_type === 'scuba' ? '스쿠버다이빙' : post.dive_type === 'technical' ? '테크니컬다이빙' : '프리다이빙') : '다이빙 로그'}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {post.dive_site && (
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <MapPin className="h-3 w-3" />
                            <button
                              type="button"
                              onClick={() => goToLocationPage(post.dive_site!)}
                              className="hover:underline"
                            >
                              {post.dive_site}
                            </button>
                          </div>
                        )}
                        {post.max_depth != null && (
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <Gauge className="h-3 w-3" />
                            <span>{post.max_depth}m</span>
                          </div>
                        )}
                        {post.water_temperature != null && (
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <Thermometer className="h-3 w-3" />
                            <span>{post.water_temperature}°C</span>
                          </div>
                        )}
                        {post.dive_duration != null && (
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <Clock className="h-3 w-3" />
                            <span>{post.dive_duration}분</span>
                          </div>
                        )}
                        {post.visibility != null && (
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <Eye className="h-3 w-3" />
                            <span>{post.visibility}m</span>
                          </div>
                        )}
                        {post.buddy_name && (
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <Users className="h-3 w-3" />
                            <span className="flex flex-wrap items-center gap-1">
                              {post.buddy_name
                                .split(',')
                                .map((name) => name.trim())
                                .filter(Boolean)
                                .map((name, idx, arr) => {
                                  const buddyId = buddyProfileMap[name];
                                  return (
                                    <span key={`${post.id}-buddy-${name}-${idx}`}>
                                      {buddyId ? (
                                        <button
                                          type="button"
                                          onClick={() => onViewProfile(buddyId)}
                                          className="text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          @{name}
                                        </button>
                                      ) : (
                                        <span>@{name}</span>
                                      )}
                                      {idx < arr.length - 1 ? ', ' : ''}
                                    </span>
                                  );
                                })}
                            </span>
                          </div>
                        )}
                      </div>

                      {(post.dive_date || post.location) && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 pt-1 border-t border-blue-200 dark:border-blue-900 space-y-0.5">
                          {post.dive_date && <div>다이빙 날짜: {new Date(post.dive_date).toLocaleDateString('ko-KR')}</div>}
                          {post.location && (
                            <div>
                              기록 위치:{' '}
                              <button
                                type="button"
                                onClick={() => goToLocationPage(post.location!)}
                                className="hover:underline"
                              >
                                {post.location}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="-mt-1">
                  <p className="text-sm leading-relaxed dark:text-white">
                    <span className="font-semibold mr-2 dark:text-white">{post.profiles.username}</span>
                    {renderTextWithMentions(
                      post.caption || '',
                      async (username) => {
                        const { data } = await db
                          .from('profiles')
                          .select('id')
                          .eq('username', username)
                          .maybeSingle();
                        if (data) {
                          onViewProfile(data.id);
                        }
                      },
                      (tag) => {
                        window.history.pushState({}, '', `/explore?tag=${encodeURIComponent(tag)}`);
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                    )}
                  </p>
                </div>


              </div>
            </div>
          );
        })}

        {!singlePostMode && loadingMore && (
          <div className="flex justify-center items-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}

        {!singlePostMode && !loadingMore && displayedPosts.length < posts.length && (
          <div className="flex justify-center items-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">스크롤하여 더 보기 ({displayedPosts.length}/{posts.length})</p>
          </div>
        )}

        {!singlePostMode && !loadingMore && displayedPosts.length === posts.length && posts.length > POSTS_PER_PAGE && (
          <div className="flex justify-center items-center py-6">
            <p className="text-sm text-gray-500">모든 게시물을 확인했습니다</p>
          </div>
        )}

        {posts.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">게시물이 없습니다</p>
          </div>
        )}
      </div>
    </div>

    {showOptionsModal && selectedPost && !showEditModal && (
        <PostOptionsModal
          isOpen={showOptionsModal}
          onClose={() => {
            setShowOptionsModal(false);
          }}
          onReport={() => alert('신고 기능은 준비중입니다')}
          onFollow={handleFollowAction}
          onFavorite={() => {
            if (selectedPost) toggleSave(selectedPost.id);
          }}
          onShare={() => {
            setShowShareModal(true);
            setShowOptionsModal(false);
          }}
          onCopyLink={handleCopyLink}
          onEmbed={handleEmbed}
          onGoToPost={() => {
            if (!selectedPost) return;
            window.history.pushState({}, '', `/post?post=${selectedPost.id}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
            setShowOptionsModal(false);
          }}
          onAboutAccount={() => {
            onViewProfile(selectedPost.user_id);
            setShowOptionsModal(false);
          }}
          onEdit={() => {
            setShowOptionsModal(false);
            setShowEditModal(true);
          }}
          onDelete={() => {
            setShowOptionsModal(false);
            setShowDeleteModal(true);
          }}
          isFollowing={followingUsers.has(selectedPost.user_id)}
          isOwnPost={selectedPost.user_id === user?.id}
          buttonRef={{ current: moreButtonRefs.current[selectedPost.id] || null }}
        />
      )}

      {showEditModal && selectedPost && (
        <EditPostModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPost(null);
          }}
          onSave={handleEditPost}
          post={selectedPost}
        />
      )}


      {viewPost && (
        <PostDetail
          post={viewPost}
          onClose={() => {
            setViewPost(null);
            if (singlePostMode) {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            } else {
              loadPosts();
            }
          }}
          onViewProfile={onViewProfile}
        />
      )}


      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedPost(null);
          }}
          onConfirm={handleDeletePost}
          loading={deleting}
        />
      )}

      {showShareModal && selectedPost && (
        <ShareModal
          post={selectedPost}
          isOpen={showShareModal}
          onCopyLink={handleCopyLink}
          onEmbed={handleEmbed}
          onClose={() => {
            setShowShareModal(false);
            setSelectedPost(null);
          }}
        />
      )}

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] bg-black/85 text-white text-sm px-4 py-2 rounded-xl shadow-xl">
          {toastMessage}
        </div>
      )}
    </>
  );
}
