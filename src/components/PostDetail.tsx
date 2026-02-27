import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin, X, Waves, Gauge, Thermometer, Clock, Eye, Users } from 'lucide-react';
import { db, Post } from '../lib/internal-db';
import { useAuth } from '../contexts/AuthContext';
import { getRelativeTime } from '../utils/timeFormat';
import { getVideoInfo } from '../utils/videoUtils';
import PostOptionsModal from './PostOptionsModal';
import MentionInput, { renderTextWithMentions } from './MentionInput';
import MediaCarousel from './MediaCarousel';

interface PostDetailProps {
  post: Post;
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export default function PostDetail({ post: initialPost, onClose, onViewProfile }: PostDetailProps) {
  const [post, setPost] = useState<Post>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadComments();
    checkFollowing();
    checkSaved();
  }, [initialPost.id]);

  const loadPost = async () => {
    const { data } = await db
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey(id, username, avatar_url, full_name),
        likes(id, user_id),
        comments(id),
        post_media(id, media_url, media_type, order_index)
      `)
      .eq('id', post.id)
      .maybeSingle();

    if (data) {
      setPost(data as Post);
    }
  };

  const loadComments = async () => {
    const { data } = await db
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey(username, avatar_url)
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(data as Comment[]);
    }
  };

  const checkFollowing = async () => {
    if (!user) return;

    const { data } = await db
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', post?.user_id)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const checkSaved = async () => {
    if (!user) return;

    const { data } = await db
      .from('saved_posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', post.id)
      .maybeSingle();

    setIsSaved(!!data);
  };

  const toggleSave = async () => {
    if (!user) return;

    if (isSaved) {
      await db
        .from('saved_posts')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post.id);

      setIsSaved(false);
    } else {
      await db
        .from('saved_posts')
        .insert({ user_id: user.id, post_id: post.id });

      setIsSaved(true);
    }
  };

  const toggleLike = async () => {
    if (!user || !post) return;

    const isLiked = post.likes.some((like: any) => like.user_id === user.id);

    if (isLiked) {
      await db
        .from('likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
    } else {
      await db
        .from('likes')
        .insert({ post_id: post.id, user_id: user.id });
    }

    await loadPost();
  };

  const addComment = async () => {
    if (!user || !commentInput.trim()) return;

    await db.from('comments').insert({
      post_id: post.id,
      user_id: user.id,
      content: commentInput,
    });

    setCommentInput('');
    await loadComments();
    await loadPost();
  };

  const handleFollowAction = async () => {
    if (!user || !post) return;

    if (isFollowing) {
      await db
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', post.user_id);
      setIsFollowing(false);
    } else {
      await db
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: post.user_id,
        });
      setIsFollowing(true);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    alert('링크가 복사되었습니다');
  };

  const handleEmbed = () => {
    const embedCode = `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="${window.location.origin}/post/${post.id}/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="${window.location.origin}/post/${post.id}/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">Instagram에서 이 게시물 보기</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="${window.location.origin}/post/${post.id}/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">${post?.profiles.username}(@${post?.profiles.username})님의 공유 게시물</a></p></div></blockquote>
<script async src="//www.instagram.com/embed.js"></script>`;

    navigator.clipboard.writeText(embedCode);
    alert('퍼가기 코드가 복사되었습니다');
  };

  if (!post) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const isLiked = post.likes.some((like: any) => like.user_id === user?.id);
  const likeCount = post.likes.length;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-75 flex items-center justify-center p-4" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white hover:text-gray-300 z-10"
      >
        <X className="h-8 w-8" />
      </button>

      <div
        className="bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 w-full max-w-5xl max-h-[90vh] flex rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 max-h-[90vh] bg-black dark:bg-gray-950 flex items-center justify-center">
          {post.video_url ? (
            (() => {
              const videoInfo = getVideoInfo(post.video_url);
              if (videoInfo.type === 'youtube' || videoInfo.type === 'vimeo') {
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <iframe
                      src={videoInfo.embedUrl}
                      className="w-full h-[90vh]"
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
                  className="w-full h-auto max-h-[90vh] object-contain"
                />
              );
            })()
          ) : post.image_url ? (
            <img
              src={post.image_url}
              alt="Post"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          ) : null}
        </div>

        <div className="w-[420px] flex flex-col bg-white dark:bg-[#121212] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-[#262626] sticky top-0 bg-white dark:bg-[#121212] z-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                  {post.profiles.avatar_url ? (
                    <img
                      src={post.profiles.avatar_url}
                      alt={post.profiles.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-300 font-semibold">
                      {post.profiles.username[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm dark:text-white">{post.profiles.username}</p>
                {post.location && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    {post.location}
                  </p>
                )}
              </div>
            </div>
            <button
              ref={moreButtonRef}
              onClick={() => setShowOptionsModal(true)}
              className="hover:bg-gray-100 dark:hover:bg-gray-900 p-2 rounded-full"
            >
              <MoreHorizontal className="h-5 w-5 dark:text-white" />
            </button>
          </div>

          <div className="border-b border-gray-300 dark:border-[#262626]">
            <div className="w-full bg-black flex items-center justify-center">
              {post.post_media && post.post_media.length > 0 ? (
                <MediaCarousel
                  media={post.post_media}
                  className="w-full"
                  style={{ maxHeight: '300px' }}
                />
              ) : post.video_url ? (
                (() => {
                  const videoInfo = getVideoInfo(post.video_url);
                  if (videoInfo.type === 'youtube' || videoInfo.type === 'vimeo') {
                    return (
                      <div className="relative w-full" style={{ paddingBottom: '56.25%', maxHeight: '300px' }}>
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
                      className="w-full max-h-[300px] object-contain"
                    />
                  );
                })()
              ) : post.image_url ? (
                <img
                  src={post.image_url}
                  alt="Post"
                  className="w-full max-h-[300px] object-cover"
                />
              ) : null}
            </div>

            <div className="p-4">
              <p className="text-sm dark:text-white">
                <span className="font-semibold mr-2">{post.profiles.username}</span>
                {renderTextWithMentions(post.caption || '', async (username) => {
                  const { data } = await db
                    .from('profiles')
                    .select('id')
                    .eq('username', username)
                    .maybeSingle();
                  if (data) {
                    onViewProfile(data.id);
                  }
                }, (tag) => {
                  window.history.pushState({}, '', `/explore?tag=${encodeURIComponent(tag)}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                })}
              </p>

              {(post.dive_site || post.water_temperature || post.max_depth || post.dive_duration || post.visibility || post.buddy) && (
                <div className="mt-3 space-y-2">
                  {post.dive_site && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Waves className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      <span className="font-medium">다이브 사이트:</span>
                      <span className="ml-1">{post.dive_site}</span>
                    </div>
                  )}
                  {post.max_depth && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Gauge className="h-3.5 w-3.5 mr-2 text-blue-500" />
                      <span className="font-medium">최대 수심:</span>
                      <span className="ml-1">{post.max_depth}m</span>
                    </div>
                  )}
                  {post.water_temperature && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Thermometer className="h-3.5 w-3.5 mr-2 text-red-500" />
                      <span className="font-medium">수온:</span>
                      <span className="ml-1">{post.water_temperature}°C</span>
                    </div>
                  )}
                  {post.dive_duration && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Clock className="h-3.5 w-3.5 mr-2 text-green-500" />
                      <span className="font-medium">다이브 시간:</span>
                      <span className="ml-1">{post.dive_duration}분</span>
                    </div>
                  )}
                  {post.visibility && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Eye className="h-3.5 w-3.5 mr-2 text-purple-500" />
                      <span className="font-medium">시야:</span>
                      <span className="ml-1">{post.visibility}m</span>
                    </div>
                  )}
                  {post.buddy && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <Users className="h-3.5 w-3.5 mr-2 text-orange-500" />
                      <span className="font-medium">버디:</span>
                      <span className="ml-1">{post.buddy}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{getRelativeTime(post.created_at)}</p>
            </div>
          </div>

          <div className="border-b border-gray-300 dark:border-[#262626] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleLike}
                  className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300 transition-colors"
                >
                  <Heart
                    className={`h-7 w-7 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
                  />
                </button>
                <button className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300">
                  <MessageCircle className="h-7 w-7" />
                </button>
                <button className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300">
                  <Send className="h-7 w-7" />
                </button>
              </div>
              <button onClick={toggleSave} className="hover:text-gray-600 dark:text-white dark:hover:text-gray-300 transition-colors">
                <Bookmark className={`h-7 w-7 ${isSaved ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </button>
            </div>

            {likeCount > 0 && (
              <p className="font-semibold text-sm mb-2 dark:text-white">좋아요 {likeCount}개</p>
            )}

            <div className="flex items-center space-x-2">
              <MentionInput
                value={commentInput}
                onChange={setCommentInput}
                onSubmit={addComment}
                placeholder="댓글 달기..."
                className="flex-1 outline-none text-sm px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-[#262626] dark:text-white rounded-full focus:border-gray-400 dark:focus:border-gray-500"
              />
              {commentInput.trim() && (
                <button
                  onClick={addComment}
                  className="text-blue-500 font-semibold text-sm hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500 px-3"
                >
                  게시
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-4 dark:bg-[#121212]">
            <div className="flex space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5 flex-shrink-0">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                  {post.profiles.avatar_url ? (
                    <img
                      src={post.profiles.avatar_url}
                      alt={post.profiles.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 dark:text-gray-300 font-semibold">
                      {post.profiles.username[0].toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm dark:text-white">
                  <span className="font-semibold mr-2">{post.profiles.username}</span>
                  {renderTextWithMentions(post.caption || '', async (username) => {
                    const { data } = await db
                      .from('profiles')
                      .select('id')
                      .eq('username', username)
                      .maybeSingle();
                    if (data) {
                      onViewProfile(data.id);
                    }
                  }, (tag) => {
                    window.history.pushState({}, '', `/explore?tag=${encodeURIComponent(tag)}`);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getRelativeTime(post.created_at)}</p>
              </div>
            </div>

            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 -mx-2 px-2 py-1 rounded"
                onClick={() => {
                  const mention = `@${comment.profiles.username} `;
                  if (!commentInput.includes(mention)) {
                    setCommentInput(commentInput ? `${commentInput} ${mention}` : mention);
                  }
                }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                    {comment.profiles.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
                        {comment.profiles.username[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm dark:text-white">
                    <span className="font-semibold mr-2">{comment.profiles.username}</span>
                    {renderTextWithMentions(comment.content, async (username) => {
                      const { data } = await db
                        .from('profiles')
                        .select('id')
                        .eq('username', username)
                        .maybeSingle();
                      if (data) {
                        onViewProfile(data.id);
                      }
                    }, (tag) => {
                      window.history.pushState({}, '', `/explore?tag=${encodeURIComponent(tag)}`);
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getRelativeTime(comment.created_at)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-300 dark:border-[#262626] p-3 dark:bg-[#121212]">
            <p className="text-xs text-gray-500 dark:text-gray-400">{getRelativeTime(post.created_at)}</p>
          </div>
        </div>
      </div>

      {showOptionsModal && (
        <PostOptionsModal
          isOpen={showOptionsModal}
          onClose={() => setShowOptionsModal(false)}
          onReport={() => alert('신고 기능이 실행됩니다')}
          onFollow={handleFollowAction}
          onFavorite={() => alert('즐겨찾기에 추가되었습니다')}
          onShare={() => alert('공유 기능이 실행됩니다')}
          onCopyLink={handleCopyLink}
          onEmbed={handleEmbed}
          onGoToPost={() => {}}
          onAboutAccount={() => alert('계정 정보가 표시됩니다')}
          isFollowing={isFollowing}
          isOwnPost={post.user_id === user?.id}
          buttonRef={moreButtonRef}
        />
      )}
    </div>
  );

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(modalContent, modalRoot);
}
