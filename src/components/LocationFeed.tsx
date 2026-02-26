import { useEffect, useState, useRef } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ArrowLeft, MapPin, Waves, Gauge, Thermometer, Clock, Eye, Users } from 'lucide-react';
import { db, Post } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/timeFormat';
import { loadGoogleMaps } from '../utils/googleMaps';
import { getVideoInfo } from '../utils/videoUtils';
import PostOptionsModal from './PostOptionsModal';
import PostDetail from './PostDetail';
import ShareModal from './ShareModal';
import EditPostModal from './EditPostModal';
import MentionInput, { renderTextWithMentions } from './MentionInput';

interface LocationFeedProps {
  location: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

interface LocationCoordinates {
  lat: number;
  lng: number;
}

const LOCATION_COORDINATES: Record<string, LocationCoordinates> = {
  '제주도': { lat: 33.4996, lng: 126.5312 },
  '제주도 서귀포': { lat: 33.2541, lng: 126.5601 },
  '제주도 우도': { lat: 33.5052, lng: 126.9533 },
  '제주도 협재': { lat: 33.3941, lng: 126.2398 },
  '제주도 문섬': { lat: 33.2227, lng: 126.5659 },
  '제주도 범섬': { lat: 33.2277, lng: 126.5412 },
  '제주도 성산': { lat: 33.4622, lng: 126.9269 },
  '제주도 지귀도': { lat: 33.2211, lng: 126.5633 },
  '필리핀 코론': { lat: 12.0033, lng: 120.2086 },
  '필리핀 보홀': { lat: 9.8495, lng: 124.1438 },
  '필리핀 보라카이': { lat: 11.9674, lng: 121.9248 },
  '필리핀 엘니도': { lat: 11.1949, lng: 119.4013 },
  '필리핀 모알보알': { lat: 9.9482, lng: 123.3959 },
  '필리핀 두마게티': { lat: 9.3068, lng: 123.3054 },
  '필리핀 아닐라오': { lat: 13.7634, lng: 120.9143 },
  '필리핀 막탄': { lat: 10.3094, lng: 123.9616 },
  '필리핀 팔라완': { lat: 9.8349, lng: 118.7384 },
  '몰디브': { lat: 3.2028, lng: 73.2207 },
  '하와이': { lat: 21.3099, lng: -157.8581 },
  '하와이 마우이': { lat: 20.7984, lng: -156.3319 },
  '하와이 빅아일랜드': { lat: 19.5429, lng: -155.6659 },
  '태국 푸켓': { lat: 7.8804, lng: 98.3923 },
  '태국 코타오': { lat: 10.0956, lng: 99.8386 },
  '태국 시밀란': { lat: 8.6500, lng: 97.6417 },
  '태국 코사무이': { lat: 9.5357, lng: 100.0629 },
  '태국 크라비': { lat: 8.0863, lng: 98.9063 },
  '태국 피피섬': { lat: 7.7407, lng: 98.7784 },
  '태국 란타': { lat: 7.5697, lng: 99.0473 },
  '인도네시아 발리': { lat: -8.3405, lng: 115.0920 },
  '인도네시아 코모도': { lat: -8.5459, lng: 119.4882 },
  '인도네시아 라자암팟': { lat: -0.2333, lng: 130.5167 },
  '인도네시아 누사페니다': { lat: -8.7294, lng: 115.5446 },
  '인도네시아 롬복': { lat: -8.6500, lng: 116.3242 },
  '일본 오키나와': { lat: 26.2124, lng: 127.6809 },
  '일본 요나구니': { lat: 24.4669, lng: 122.9956 },
  '괌': { lat: 13.4443, lng: 144.7937 },
  '사이판': { lat: 15.1850, lng: 145.7467 },
  '팔라우': { lat: 7.5150, lng: 134.5825 },
  '베트남 나트랑': { lat: 12.2388, lng: 109.1967 },
  '베트남 푸꾸옥': { lat: 10.2127, lng: 103.9670 },
  '말레이시아 시파단': { lat: 4.1133, lng: 118.6283 },
  '호주 그레이트 배리어 리프': { lat: -18.2871, lng: 147.6992 },
  '이집트 홍해': { lat: 26.1041, lng: 35.1127 },
  '이집트 다합': { lat: 28.5094, lng: 34.5155 },
  '멕시코 세노테': { lat: 20.8328, lng: -88.4934 },
  '멕시코 툴룸': { lat: 20.2114, lng: -87.4654 },
  '멕시코 유카탄': { lat: 20.7099, lng: -89.0943 },
  '멕시코 코수멜': { lat: 20.4230, lng: -86.9223 },
  '바하마': { lat: 25.0343, lng: -77.3963 },
  '갈라파고스': { lat: -0.9538, lng: -90.9656 },
  '남아공': { lat: -30.5595, lng: 22.9375 },
  '피지': { lat: -17.7134, lng: 178.0650 },
  '스페인 마요르카': { lat: 39.6953, lng: 3.0176 },
  '미국 캘리포니아': { lat: 36.7783, lng: -119.4179 },
};

export default function LocationFeed({ location, onBack, onViewProfile }: LocationFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [viewPost, setViewPost] = useState<Post | null>(null);
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);

  useEffect(() => {
    loadPosts();
    if (user) {
      loadFollowingUsers();
      loadSavedPosts();
    }
  }, [location, user]);

  useEffect(() => {
    if (posts.length > 0) {
      loadGoogleMaps().then(() => {
        initMap();
      }).catch(err => {
        console.error('Failed to load Google Maps:', err);
      });
    }
  }, [posts]);

  const initMap = () => {
    if (!mapRef.current || !(window as any).google) return;

    const coordinates = LOCATION_COORDINATES[location] || { lat: 33.4996, lng: 126.5312 };
    const google = (window as any).google;

    const map = new google.maps.Map(mapRef.current, {
      center: coordinates,
      zoom: 10,
      mapTypeId: 'terrain',
      styles: [
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#a2daf2' }],
        },
      ],
    });

    googleMapRef.current = map;

    new google.maps.Marker({
      position: coordinates,
      map: map,
      title: location,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
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

  const loadPosts = async () => {
    setLoading(true);

    const { data } = await db
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(id, username, avatar_url, full_name),
        likes(id, user_id),
        comments(id)
      `)
      .ilike('location', `%${location}%`)
      .order('created_at', { ascending: false });

    if (data) {
      setPosts(data as Post[]);
    }

    setLoading(false);
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const userLiked = post.likes?.some((like: any) => like.user_id === user.id);

    if (userLiked) {
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

  const toggleSave = async (postId: string) => {
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
      await db.from('saved_posts').insert({ user_id: user.id, post_id: postId });

      const newSaved = new Set(savedPosts);
      newSaved.add(postId);
      setSavedPosts(newSaved);
    }
  };

  const addComment = async (postId: string) => {
    if (!user || !commentInputs[postId]?.trim()) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    await db.from('comments').insert({
      post_id: postId,
      user_id: user.id,
      content: commentInputs[postId].trim(),
    });

    if (post.user_id !== user.id) {
      await db.from('notifications').insert({
        user_id: post.user_id,
        actor_id: user.id,
        type: 'comment',
        post_id: postId,
      });
    }

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    await loadPosts();
  };

  const handleMoreClick = (post: Post) => {
    setSelectedPost(post);
    setShowOptionsModal(true);
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
    alert('링크가 복사되었습니다');
  };

  const handleEmbed = () => {
    if (!selectedPost) return;
    const embedCode = `<blockquote class="instagram-media">...</blockquote>`;
    navigator.clipboard.writeText(embedCode);
    alert('퍼가기 코드가 복사되었습니다');
  };

  const handleEditPost = async (updatedData: Partial<Post>) => {
    if (!selectedPost || !user) return;

    await db
      .from('posts')
      .update(updatedData)
      .eq('id', selectedPost.id);

    await loadPosts();
    setSelectedPost(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="bg-white border-b border-gray-300 sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button onClick={onBack} className="mr-4">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{location}</h1>
            <p className="text-sm text-gray-500">{posts.length}개의 게시물</p>
          </div>
        </div>
      </div>

      <div ref={mapRef} className="w-full h-64 bg-gray-200"></div>

      <div className="divide-y divide-gray-300">
        {posts.map((post) => (
          <article key={post.id} className="bg-white">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center space-x-3">
                <button onClick={() => onViewProfile(post.profiles.id)}>
                  <img
                    src={post.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.profiles.username}`}
                    alt={post.profiles.username}
                    className="w-8 h-8 rounded-full"
                  />
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onViewProfile(post.profiles.id)}
                    className="font-semibold text-sm hover:text-gray-500"
                  >
                    {post.profiles.username}
                  </button>
                  {post.location && (
                    <>
                      <span className="text-gray-500">•</span>
                      <button className="flex items-center text-xs text-gray-500 hover:text-gray-700">
                        <MapPin className="h-3 w-3 mr-1" />
                        {post.location}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => handleMoreClick(post)}>
                <MoreHorizontal className="h-6 w-6" />
              </button>
            </div>

            {post.image_url && (
              <img
                src={post.image_url}
                alt="Post"
                className="w-full"
                onDoubleClick={() => toggleLike(post.id)}
              />
            )}

            {post.video_url && (() => {
              const videoInfo = getVideoInfo(post.video_url);
              if (videoInfo.type === 'youtube' || videoInfo.type === 'vimeo') {
                return (
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
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
                <video
                  src={post.video_url}
                  controls
                  className="w-full"
                  onDoubleClick={() => toggleLike(post.id)}
                />
              );
            })()}

            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-4">
                  <button onClick={() => toggleLike(post.id)}>
                    <Heart
                      className={`h-7 w-7 ${
                        post.likes?.some((like: any) => like.user_id === user?.id)
                          ? 'fill-red-500 text-red-500'
                          : ''
                      }`}
                    />
                  </button>
                  <button onClick={() => setViewPost(post)}>
                    <MessageCircle className="h-7 w-7" />
                  </button>
                  <button onClick={() => { setSelectedPost(post); setShowShareModal(true); }}>
                    <Send className="h-7 w-7" />
                  </button>
                </div>
                <button onClick={() => toggleSave(post.id)} className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300 transition-colors">
                  <Bookmark
                    className={`h-7 w-7 ${savedPosts.has(post.id) ? 'fill-yellow-400 text-yellow-400' : ''}`}
                  />
                </button>
              </div>

              {post.likes && post.likes.length > 0 && (
                <p className="font-semibold text-sm mb-2">
                  좋아요 {post.likes.length}개
                </p>
              )}

              {post.caption && (
                <p className="text-sm mb-2">
                  <button
                    onClick={() => onViewProfile(post.profiles.id)}
                    className="font-semibold mr-2 hover:text-gray-500"
                  >
                    {post.profiles.username}
                  </button>
                  {renderTextWithMentions(post.caption, onViewProfile)}
                </p>
              )}

              {post.dive_site && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Waves className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm font-semibold text-blue-900">다이빙 정보</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                      <span>{post.dive_site}</span>
                    </div>
                    {post.max_depth && (
                      <div className="flex items-center">
                        <Gauge className="h-3 w-3 mr-1 text-gray-500" />
                        <span>{post.max_depth}m</span>
                      </div>
                    )}
                    {post.water_temperature && (
                      <div className="flex items-center">
                        <Thermometer className="h-3 w-3 mr-1 text-gray-500" />
                        <span>{post.water_temperature}°C</span>
                      </div>
                    )}
                    {post.dive_duration && (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-gray-500" />
                        <span>{post.dive_duration}분</span>
                      </div>
                    )}
                    {post.visibility && (
                      <div className="flex items-center">
                        <Eye className="h-3 w-3 mr-1 text-gray-500" />
                        <span>{post.visibility}m</span>
                      </div>
                    )}
                    {post.buddy_name && (
                      <div className="flex items-center">
                        <Users className="h-3 w-3 mr-1 text-gray-500" />
                        <span>{post.buddy_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {post.comments && post.comments.length > 0 && (
                <button
                  onClick={() => setViewPost(post)}
                  className="text-sm text-gray-500 mb-2"
                >
                  댓글 {post.comments.length}개 모두 보기
                </button>
              )}

              <p className="text-xs text-gray-500 mb-2">
                {getRelativeTime(post.created_at)}
              </p>

              <div className="flex items-center pt-2 border-t border-gray-200">
                <MentionInput
                  value={commentInputs[post.id] || ''}
                  onChange={(value) =>
                    setCommentInputs(prev => ({ ...prev, [post.id]: value }))
                  }
                  onSubmit={() => addComment(post.id)}
                  placeholder="댓글 달기..."
                />
              </div>
            </div>
          </article>
        ))}
      </div>

      {showOptionsModal && selectedPost && (
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
            setShowEditModal(true);
            setShowOptionsModal(false);
          }}
          isFollowing={followingUsers.has(selectedPost.user_id)}
          isOwnPost={selectedPost.user_id === user?.id}
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
            loadPosts();
          }}
          onViewProfile={onViewProfile}
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
    </div>
  );
}
