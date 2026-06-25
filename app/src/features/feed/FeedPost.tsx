import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Image,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { SvgUri } from 'react-native-svg';
import { Bookmark, Building2, Gauge, Heart, MapPin, MessageCircle, MoreHorizontal, PlayCircle, Send, Thermometer, Waves, X } from 'lucide-react-native';
import { formatDate } from '../../lib/utils';
import { appRouteMap } from '../../config/sitemap';
import { useAuth } from '../../hooks/useAuth';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useToast } from '../../components/Toast';
import { apiClient, type FeedCommentItem, type FeedMediaItem } from '../../lib/api';
import { shareToInstagramFeed } from '../../services/instagramShareService';

interface FeedPostProps {
  post: {
    id: string;
    user: {
      id?: string;
      name: string;
      avatar?: string;
    };
    content: string;
    image?: string;
    media?: FeedMediaItem[];
    likes: number;
    comments: number;
    createdAt: string;
    location?: string;
    diveSite?: string;
    diveType?: string;
    gasType?: string;
    gasPercent?: number;
    resort?: string;
    maxDepth?: number;
    waterTemperature?: number;
    visibility?: number;
    tags?: string[];
  };
}

export function FeedPost({ post }: FeedPostProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const { showToast } = useToast();
  const { width: screenWidth } = useWindowDimensions();

  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const [postContent, setPostContent] = useState(post.content);
  const [postLocation, setPostLocation] = useState(post.location || '');
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [interactionLoading, setInteractionLoading] = useState(false);

  const [comments, setComments] = useState<FeedCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [editCaption, setEditCaption] = useState(post.content);
  const [editLocation, setEditLocation] = useState(post.location || '');
  const [editSaving, setEditSaving] = useState(false);
  const [InlineWebView, setInlineWebView] = useState<any>(null);
  const doubleTapRef = useRef<{ mediaId: string; at: number } | null>(null);

  const hasRenderableImage = typeof post.image === 'string' && /^https?:\/\//.test(post.image);
  const postImageUri = hasRenderableImage ? (post.image as string) : '';
  const mediaItems = useMemo(
    () =>
      Array.isArray(post.media) && post.media.length
        ? post.media.filter((media) => typeof media?.url === 'string' && /^https?:\/\//.test(media.url))
        : hasRenderableImage
          ? [{ id: `${post.id}-image`, url: postImageUri, type: 'image', order: 0 } as FeedMediaItem]
          : [],
    [hasRenderableImage, post.id, post.media, postImageUri]
  );
  const imageHeight = Math.min(Math.max(screenWidth * 1.33, 360), 640);
  const postTags = useMemo(
    () => (Array.isArray(post.tags) ? post.tags.map((tag) => String(tag || '').replace(/^#/, '').trim()).filter(Boolean) : []),
    [post.tags]
  );
  const diveTypeLabel = post.diveType ? t(`logsForm.diveTypes.${post.diveType}` as any, { defaultValue: post.diveType }) : '';
  const gasTypeLabel = post.gasType ? t(`logsForm.gasTypes.${post.gasType}` as any, { defaultValue: post.gasType }) : '';
  const isOwnPost = Boolean(user?.id && post.user?.id && String(user.id) === String(post.user.id));
  const iconColor = isDark ? '#e2e8f0' : '#1e293b';
  const placeholderColor = isDark ? '#64748b' : '#94a3b8';
  const modalSheetStyle = useMemo(
    () => [styles.sheet, isDark ? styles.sheetDark : null],
    [isDark]
  );
  const modalHandleStyle = useMemo(
    () => [styles.handle, isDark ? styles.handleDark : null],
    [isDark]
  );
  const modalDialogStyle = useMemo(
    () => [styles.dialog, isDark ? styles.dialogDark : null],
    [isDark]
  );

  /* eslint-disable react-hooks/set-state-in-effect -- post가 바뀔 때 로컬 표시 상태를 새 게시물 기준으로 동기화해야 함 */
  useEffect(() => {
    setPostContent(post.content);
    setPostLocation(post.location || '');
    setLikeCount(post.likes);
    setCommentCount(post.comments);
    setEditCaption(post.content);
    setEditLocation(post.location || '');
    setMediaIndex(0);
    setPlayingVideoId(null);
  }, [post.id, post.content, post.location, post.likes, post.comments]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openTagSearch = (tag: string) => {
    const raw = String(tag || '').replace(/^#/, '').trim();
    if (!raw) return;
    setMenuOpen(false);
    router.push(`${appRouteMap.explore.path}?tag=${encodeURIComponent(raw)}` as never);
  };

  const renderContent = (text: string) => {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const parts = raw.split(/(#[\p{L}\p{N}_-]+)/gu);
    return (
      <Text className="mb-4 text-[15px] leading-6 text-surface-800 dark:text-surface-100">
        {parts.map((part, index) => {
          if (/^#[\p{L}\p{N}_-]+$/u.test(part)) {
            const tag = part.replace(/^#/, '');
            return (
              <Text
                key={`tag-${tag}-${index}`}
                onPress={() => openTagSearch(tag)}
                className="font-semibold text-brand-700 underline decoration-brand-200"
              >
                {part}
              </Text>
            );
          }
          return <Text key={`txt-${index}`}>{part}</Text>;
        })}
      </Text>
    );
  };

  const onMediaScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / screenWidth);
    setMediaIndex(Math.max(0, Math.min(nextIndex, Math.max(mediaItems.length - 1, 0))));
    setPlayingVideoId(null);
  };

  useEffect(() => {
    let canceled = false;
    const selectedVideo = mediaItems.find((item) => item.type === 'video' && item.id === playingVideoId) || null;
    if (!selectedVideo) {
      return undefined;
    }
    if (InlineWebView) return undefined;

    import('react-native-webview')
      .then((module) => {
        if (canceled) return;
        const Component = (module.WebView || module.default) as any;
        setInlineWebView(() => Component);
      })
      .catch(() => {
        if (canceled) return;
        setInlineWebView(null);
      });

    return () => {
      canceled = true;
    };
  }, [InlineWebView, mediaItems, playingVideoId]);

  useEffect(() => {
    let canceled = false;
    const loadInteractions = async () => {
      if (!user?.id) return;
      setInteractionLoading(true);
      try {
        const authorId = String(post.user?.id || '').trim();
        const canFollow = Boolean(authorId && authorId !== String(user.id));
        const [liked, saved, following] = await Promise.all([
          apiClient.isPostLikedByUser(post.id, user.id),
          apiClient.isPostSavedByUser(post.id, user.id),
          canFollow ? apiClient.isFollowingUser(user.id, authorId) : Promise.resolve(false),
        ]);
        if (!canceled) {
          setIsLiked(liked);
          setIsSaved(saved);
          setIsFollowingAuthor(following);
        }
      } catch {
        if (!canceled) {
          setIsLiked(false);
          setIsSaved(false);
          setIsFollowingAuthor(false);
        }
      } finally {
        if (!canceled) setInteractionLoading(false);
      }
    };

    loadInteractions();
    return () => {
      canceled = true;
    };
  }, [post.id, post.user?.id, user?.id]);

  const syncFeedQueries = async () => {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: ['feed'] }),
      queryClient.invalidateQueries({ queryKey: ['reels'] }),
      queryClient.invalidateQueries({ queryKey: ['saved-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['profile-grid-own-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['profile-grid-own-reels'] }),
      queryClient.invalidateQueries({ queryKey: ['profile-grid-saved'] }),
      queryClient.invalidateQueries({ queryKey: ['post-comments', post.id] }),
    ]);
  };

  const removePostFromCachedQueries = (postId: string) => {
    const removeFromAnyList = (value: any) => {
      if (Array.isArray(value)) {
        return value.filter((item) => String(item?.id || item?.post_id || '') !== String(postId));
      }
      if (value && Array.isArray(value.pages)) {
        return {
          ...value,
          pages: value.pages.map((page: any) => ({
            ...page,
            data: Array.isArray(page?.data)
              ? page.data.filter((item: any) => String(item?.id || item?.post_id || '') !== String(postId))
              : page?.data,
          })),
        };
      }
      return value;
    };

    queryClient.setQueriesData({ queryKey: ['feed'] }, removeFromAnyList);
    queryClient.setQueriesData({ queryKey: ['reels'] }, removeFromAnyList);
    queryClient.setQueriesData({ queryKey: ['saved-feed'] }, removeFromAnyList);
    queryClient.setQueriesData({ queryKey: ['profile-grid-own-feed'] }, removeFromAnyList);
    queryClient.setQueriesData({ queryKey: ['profile-grid-own-reels'] }, removeFromAnyList);
    queryClient.setQueriesData({ queryKey: ['profile-grid-saved'] }, removeFromAnyList);
  };

  const sharePost = async () => {
    setMenuOpen(false);
    try {
      const result = await shareToInstagramFeed(
        `Divergram • ${post.user.name}`,
        `https://divergram.com/post/${encodeURIComponent(post.id)}`
      );
      if (!result.installed) {
        showToast({
          type: 'info',
          title: t('feed.media.instagramFallback', { defaultValue: 'Instagram 미설치: 기본 공유 시트를 사용했습니다.' }),
        });
      }
    } catch {
      showToast({
        type: 'error',
        title: t('feed.menu.shareFailed', { defaultValue: '공유에 실패했습니다.' }),
      });
    }
  };

  const handleLikePress = async () => {
    if (!user?.id || likePending) return;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;

    setLikePending(true);
    setIsLiked(nextLiked);
    setLikeCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));

    try {
      const result = await apiClient.togglePostLike(post.id, user.id);
      setIsLiked(result.liked);
      setLikeCount(result.count);
      await syncFeedQueries();
    } catch {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      showToast({
        type: 'error',
        title: t('feed.menu.likeFailed', { defaultValue: '좋아요 처리에 실패했습니다.' }),
      });
    } finally {
      setLikePending(false);
    }
  };

  const handleBookmarkPress = async () => {
    if (!user?.id || savePending) return;
    const prevSaved = isSaved;
    const nextSaved = !prevSaved;
    setSavePending(true);
    setIsSaved(nextSaved);

    try {
      const result = await apiClient.toggleSavedPost(post.id, user.id);
      setIsSaved(result.saved);
      showToast({
        type: 'success',
        title: result.saved
          ? t('feed.menu.favoriteAdded', { defaultValue: '즐겨찾기에 추가했습니다.' })
          : t('feed.menu.favoriteRemoved', { defaultValue: '즐겨찾기에서 제거했습니다.' }),
      });
      await syncFeedQueries();
    } catch {
      setIsSaved(prevSaved);
      showToast({
        type: 'error',
        title: t('feed.menu.favoriteFailed', { defaultValue: '즐겨찾기 처리에 실패했습니다.' }),
      });
    } finally {
      setSavePending(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user?.id || followPending) return;
    const authorId = String(post.user?.id || '').trim();
    if (!authorId || authorId === String(user.id)) return;

    const prev = isFollowingAuthor;
    setFollowPending(true);
    setIsFollowingAuthor(!prev);
    try {
      const result = await apiClient.toggleFollowUser(user.id, authorId);
      setIsFollowingAuthor(result.following);
      showToast({
        type: 'success',
        title: result.following
          ? t('feed.menu.followed', { defaultValue: '팔로우했습니다.' })
          : t('feed.menu.unfollowed', { defaultValue: '팔로우를 취소했습니다.' }),
      });
      await queryClient.invalidateQueries({ queryKey: ['feed'] });
    } catch {
      setIsFollowingAuthor(prev);
      showToast({
        type: 'error',
        title: t('feed.menu.followFailed', { defaultValue: '팔로우 처리에 실패했습니다.' }),
      });
    } finally {
      setFollowPending(false);
    }
  };

  const openReport = () => {
    setMenuOpen(false);
    const query = `postId=${encodeURIComponent(post.id)}&reportedUserId=${encodeURIComponent(post.user.id || '')}`;
    router.push(`${appRouteMap.report.path}?${query}` as never);
  };

  const openAccountInfo = () => {
    setMenuOpen(false);
    const targetId = post.user.id || user?.id;
    if (!targetId) return;
    router.push(`${appRouteMap.account.path}?userId=${encodeURIComponent(targetId)}` as never);
  };

  const openPost = () => {
    setMenuOpen(false);
    router.push(`${appRouteMap.post.path}?post=${encodeURIComponent(post.id)}` as never);
  };

  const openAuthorProfile = () => {
    const targetId = String(post.user?.id || '').trim();
    if (!targetId) return;
    router.push(`${appRouteMap.account.path}?userId=${encodeURIComponent(targetId)}` as never);
  };

  const openLocationMap = () => {
    const location = postLocation.trim();
    if (!location) return;
    router.push(`${appRouteMap.location.path}?location=${encodeURIComponent(location)}` as never);
  };

  const openEdit = () => {
    setMenuOpen(false);
    router.push(`${appRouteMap.logs.path}?postId=${encodeURIComponent(post.id)}` as never);
  };

  const confirmDeletePost = () => {
    setMenuOpen(false);
    setCommentsOpen(false);
    setEditOpen(false);
    Alert.alert(
      t('feed.menu.deleteTitle', { defaultValue: '게시물을 삭제할까요?' }),
      t('feed.menu.deleteBody', { defaultValue: '삭제한 게시물은 복구할 수 없습니다.' }),
      [
        { text: t('common.cancel', { defaultValue: '취소' }), style: 'cancel' },
        {
          text: t('feed.menu.delete', { defaultValue: '삭제' }),
          style: 'destructive',
          onPress: async () => {
            if (deletePending) return;
            setDeletePending(true);
            try {
              const deletedPostId = post.id;
              await apiClient.deletePost(deletedPostId);
              removePostFromCachedQueries(deletedPostId);
              InteractionManager.runAfterInteractions(() => {
                void syncFeedQueries();
              });
              showToast({ type: 'success', title: t('feed.menu.deleteDone', { defaultValue: '게시물을 삭제했습니다.' }) });
            } catch {
              showToast({ type: 'error', title: t('feed.menu.deleteFailed', { defaultValue: '게시물 삭제에 실패했습니다.' }) });
            } finally {
              setDeletePending(false);
            }
          },
        },
      ]
    );
  };

  const saveEditedPost = async () => {
    const nextCaption = editCaption.trim();
    const nextLocation = editLocation.trim();
    if (!nextCaption || editSaving) return;

    setEditSaving(true);
    try {
      await apiClient.updatePost(post.id, {
        caption: nextCaption,
        location: nextLocation || undefined,
      });
      setPostContent(nextCaption);
      setPostLocation(nextLocation);
      setEditOpen(false);
      showToast({
        type: 'success',
        title: t('feed.menu.editSaved', { defaultValue: '게시물을 수정했습니다.' }),
      });
      await syncFeedQueries();
    } catch {
      showToast({
        type: 'error',
        title: t('feed.menu.editFailed', { defaultValue: '게시물 수정에 실패했습니다.' }),
      });
    } finally {
      setEditSaving(false);
    }
  };

  const loadComments = async () => {
    if (commentsLoading) return;
    setCommentsLoading(true);
    try {
      const rows = await apiClient.getPostComments(post.id);
      setComments(rows);
      setCommentCount(rows.length);
    } catch {
      showToast({
        type: 'error',
        title: t('feed.comments.loadFailed', { defaultValue: '댓글을 불러오지 못했습니다.' }),
      });
    } finally {
      setCommentsLoading(false);
    }
  };

  const openComments = async () => {
    setCommentsOpen(true);
    await loadComments();
  };

  const submitComment = async () => {
    if (!user?.id || commentSubmitting) return;
    const text = commentDraft.trim();
    if (!text) return;
    setCommentSubmitting(true);
    try {
      const created = await apiClient.addPostComment(post.id, user.id, text);
      const next = [...comments, created];
      setComments(next);
      setCommentCount(next.length);
      setCommentDraft('');
      await syncFeedQueries();
      setCommentsOpen(false);
    } catch {
      showToast({
        type: 'error',
        title: t('feed.comments.submitFailed', { defaultValue: '댓글 등록에 실패했습니다.' }),
      });
    } finally {
      setCommentSubmitting(false);
    }
  };

  const menuItems = isOwnPost
    ? [
        { key: 'edit', label: t('feed.menu.edit', { defaultValue: '수정' }), onPress: openEdit },
        { key: 'delete', label: t('feed.menu.delete', { defaultValue: '삭제' }), onPress: confirmDeletePost, tone: 'danger' as const },
        { key: 'share', label: t('feed.menu.share', { defaultValue: '공유' }), onPress: sharePost },
        { key: 'account', label: t('feed.menu.accountInfo', { defaultValue: '계정정보' }), onPress: openAccountInfo },
      ]
    : [
        {
          key: 'follow',
          label: isFollowingAuthor
            ? t('feed.menu.unfollow', { defaultValue: '팔로우 취소' })
            : t('feed.menu.follow', { defaultValue: '팔로우' }),
          onPress: () => {
            setMenuOpen(false);
            void handleFollowToggle();
          },
        },
        { key: 'report', label: t('feed.menu.report', { defaultValue: '신고' }), onPress: openReport, tone: 'danger' as const },
        {
          key: 'favorite',
          label: isSaved
            ? t('feed.menu.cancelFavorite', { defaultValue: '즐겨찾기 취소' })
            : t('feed.menu.addFavorite', { defaultValue: '즐겨찾기 추가' }),
          onPress: () => {
            setMenuOpen(false);
            void handleBookmarkPress();
          },
        },
        { key: 'post', label: t('feed.menu.openPost', { defaultValue: '게시물로 이동' }), onPress: openPost },
        { key: 'share', label: t('feed.menu.share', { defaultValue: '공유' }), onPress: sharePost },
        { key: 'account', label: t('feed.menu.accountInfo', { defaultValue: '계정정보' }), onPress: openAccountInfo },
      ];

  return (
    <>
      <View className="relative mb-5 overflow-hidden border-y border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900">
        {menuOpen ? (
          <TouchableOpacity
            className="absolute inset-0 z-20"
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        ) : null}

        <View className="px-4 pb-0 pt-4">
          <View className="mb-4 flex-row items-start">
            <TouchableOpacity activeOpacity={0.86} onPress={openAuthorProfile}>
              {post.user.avatar ? (
                <Image source={{ uri: post.user.avatar }} className="mr-3 h-14 w-14 rounded-full" resizeMode="cover" />
              ) : (
                <View className="mr-3 h-14 w-14 items-center justify-center rounded-full bg-brand-600">
                  <Text className="text-base font-semibold text-white">{post.user.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity className="flex-1" activeOpacity={0.86} onPress={openAuthorProfile}>
              <Text className="font-semibold text-surface-900 dark:text-surface-50">{post.user.name}</Text>
              <Text className="mt-0.5 text-sm text-surface-500 dark:text-surface-400">{formatDate(post.createdAt)}</Text>
              {postLocation ? (
                <TouchableOpacity activeOpacity={0.72} onPress={openLocationMap}>
                  <Text className="mt-1 text-xs font-medium text-brand-700">{postLocation}</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-full border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900"
              onPress={() => setMenuOpen((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={t('menu.more')}
            >
              <MoreHorizontal size={19} color={iconColor} />
            </TouchableOpacity>
          </View>

          {renderContent(postContent)}
        </View>

        {menuOpen ? (
          <View className="absolute right-4 top-14 z-30 w-44 overflow-hidden rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-lg">
            {menuItems.map((item, index) => (
              <View key={item.key}>
                <TouchableOpacity className="px-4 py-3" onPress={item.onPress} accessibilityRole="button">
                  <Text className={`text-sm ${item.tone === 'danger' ? 'font-semibold text-red-600' : 'font-medium text-surface-900 dark:text-surface-50'}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
                {index < menuItems.length - 1 ? <View className="h-px bg-surface-100 dark:bg-surface-800" /> : null}
              </View>
            ))}
          </View>
        ) : null}

        {mediaItems.length ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMediaScrollEnd}
              scrollEventThrottle={16}
            >
              {mediaItems.map((media) => {
                const isVideo = media.type === 'video';
                const isSvg = !isVideo && /\.svg(?:\?|#|$)/i.test(media.url);

                if (isVideo) {
                  const isPlaying = playingVideoId === media.id;
                  return (
                    <View key={media.id} style={{ height: imageHeight, width: screenWidth }} className="overflow-hidden bg-black">
                      {isPlaying ? (
                        InlineWebView ? (
                          <InlineWebView
                            source={{ html: buildInlineVideoHtml(media.url) }}
                            style={{ height: imageHeight, width: screenWidth, backgroundColor: '#000000' }}
                            allowsInlineMediaPlayback
                            mediaPlaybackRequiresUserAction={false}
                            allowsFullscreenVideo
                            scrollEnabled={false}
                          />
                        ) : (
                          <View
                            style={{ height: imageHeight, width: screenWidth }}
                            className="items-center justify-center bg-black"
                          >
                            <ActivityIndicator color="#ffffff" />
                            <Text className="mt-3 text-sm font-semibold text-white">
                              {InlineWebView ? t('feed.media.videoPreview', { defaultValue: '동영상 샘플' }) : t('common.loading', { defaultValue: '불러오는 중...' })}
                            </Text>
                          </View>
                        )
                      ) : (
                        <TouchableOpacity
                          activeOpacity={0.86}
                          onPress={() => setPlayingVideoId(media.id)}
                          style={{ height: imageHeight, width: screenWidth }}
                          className="items-center justify-center bg-surface-900"
                        >
                          {postImageUri ? (
                            <ExpoImage
                              source={{ uri: postImageUri }}
                              style={StyleSheet.absoluteFill}
                              contentFit="cover"
                            />
                          ) : null}
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2, 6, 23, 0.45)' }]} />
                          <PlayCircle size={52} color="#ffffff" />
                          <Text className="mt-3 text-sm font-semibold text-white">
                            {t('feed.media.videoPreview', { defaultValue: '동영상 샘플' })}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }

                if (isSvg) {
                  return (
                    <View key={media.id} style={{ height: imageHeight, width: screenWidth }} className="overflow-hidden bg-surface-50 dark:bg-surface-800">
                      <SvgUri uri={media.url} width="100%" height="100%" />
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    key={media.id}
                    activeOpacity={0.95}
                    style={{ height: imageHeight, width: screenWidth }}
                    onPress={() => {
                      const now = Date.now();
                      const last = doubleTapRef.current;
                      if (last && last.mediaId === media.id && now - last.at < 300) {
                        doubleTapRef.current = null;
                        void handleLikePress();
                        return;
                      }
                      doubleTapRef.current = { mediaId: media.id, at: now };
                      setTimeout(() => {
                        if (doubleTapRef.current?.mediaId === media.id && Date.now() - doubleTapRef.current.at >= 280) {
                          doubleTapRef.current = null;
                        }
                      }, 320);
                    }}
                  >
                    <ExpoImage
                      source={{ uri: media.url }}
                      style={{ height: imageHeight, width: screenWidth }}
                      contentFit="cover"
                      transition={120}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {mediaItems.length > 1 ? (
              <View className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center">
                {mediaItems.map((media, index) => (
                  <View
                    key={`${media.id}-dot`}
                    className={`mx-1 h-1.5 rounded-full ${index === mediaIndex ? 'w-5 bg-white dark:bg-surface-900' : 'w-1.5 bg-white dark:bg-surface-900/50'}`}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="px-4 pb-4 pt-4">
          {postTags.length ? (
            <View className="mb-3 flex-row flex-wrap">
              {postTags.map((tag) => (
                <TouchableOpacity
                  key={`${post.id}-${tag}`}
                  className="mb-2 mr-2 rounded-full border border-brand-200 dark:border-brand-900/40 bg-brand-50 dark:bg-brand-950/30 px-3 py-2"
                  onPress={() => openTagSearch(tag)}
                  activeOpacity={0.86}
                >
                  <Text className="text-xs font-semibold text-brand-700 dark:text-brand-200">#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View className="mb-3 flex-row flex-wrap">
            {postLocation ? <MetaChip icon={MapPin} text={postLocation} /> : null}
            {post.diveSite && post.diveSite !== postLocation ? <MetaChip icon={MapPin} text={post.diveSite} /> : null}
            {post.diveType ? <MetaChip icon={Waves} text={diveTypeLabel} /> : null}
            {post.gasType ? (
              <MetaChip
                icon={Thermometer}
                text={
                  post.gasType !== 'air' && post.gasPercent
                    ? t('feed.meta.gasWithPercent', { gas: gasTypeLabel, percent: post.gasPercent })
                    : gasTypeLabel
                }
              />
            ) : null}
            {post.resort ? <MetaChip icon={Building2} text={t('feed.meta.resort', { name: post.resort })} /> : null}
            {post.maxDepth ? <MetaChip icon={Gauge} text={`${post.maxDepth}m`} /> : null}
            {post.waterTemperature ? <MetaChip icon={Thermometer} text={`${post.waterTemperature}°C`} /> : null}
            {post.visibility ? <MetaChip icon={Waves} text={t('feed.meta.visibility', { value: post.visibility })} /> : null}
          </View>

          <View className="flex-row items-center justify-between border-t border-surface-100 dark:border-surface-800 pt-3">
            <View className="flex-row items-center">
              <TouchableOpacity
                className={`mr-2 h-10 flex-row items-center rounded-full px-3 ${isLiked ? 'bg-red-50' : 'bg-surface-50 dark:bg-surface-800'}`}
                onPress={handleLikePress}
                disabled={likePending || interactionLoading}
              >
                <Heart size={19} color={isLiked ? '#dc2626' : iconColor} fill={isLiked ? '#dc2626' : 'transparent'} />
                <Text className={`ml-2 font-semibold ${isLiked ? 'text-red-600' : 'text-surface-700 dark:text-surface-200'}`}>{likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity className="mr-2 h-10 flex-row items-center rounded-full bg-surface-50 dark:bg-surface-800 px-3" onPress={openComments}>
                <MessageCircle size={19} color={iconColor} />
                <Text className="ml-2 font-semibold text-surface-700 dark:text-surface-200">{commentCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-surface-50 dark:bg-surface-800" onPress={sharePost}>
                <Send size={19} color={iconColor} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className={`h-10 w-10 items-center justify-center rounded-full ${isSaved ? 'bg-amber-50' : 'bg-surface-50 dark:bg-surface-800'}`}
              onPress={handleBookmarkPress}
              disabled={savePending || interactionLoading}
            >
              <Bookmark size={19} color={isSaved ? '#b45309' : iconColor} fill={isSaved ? '#f59e0b' : 'transparent'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal transparent visible={commentsOpen} animationType="slide" onRequestClose={() => setCommentsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setCommentsOpen(false)} />
          <View style={modalSheetStyle}>
            <View className="flex-row items-center justify-between px-5 pb-3">
              <View style={modalHandleStyle} />
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setCommentsOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900"
                accessibilityRole="button"
                accessibilityLabel={t('common.close', { defaultValue: '닫기' })}
              >
                <X size={16} color={iconColor} />
              </TouchableOpacity>
            </View>
            <Text className="px-5 pb-3 text-lg font-semibold text-surface-900 dark:text-surface-50">
              {t('feed.comments.title', { defaultValue: '댓글' })}
            </Text>

            <View className="max-h-[360px] px-5">
              {commentsLoading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator color="#0d5fa8" />
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {comments.length ? (
                    comments.map((item) => (
                      <View key={item.id} className="mb-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-3">
                        <Text className="text-sm font-semibold text-surface-900 dark:text-surface-50">{item.user.name}</Text>
                        <Text className="mt-1 text-sm text-surface-700 dark:text-surface-200">{item.content}</Text>
                        <Text className="mt-1 text-xs text-surface-500 dark:text-surface-400">{formatDate(item.createdAt)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text className="py-6 text-center text-surface-500 dark:text-surface-400">
                      {t('feed.comments.empty', { defaultValue: '아직 댓글이 없습니다.' })}
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>

            <View className="px-5 pb-6 pt-3">
              <TextInput
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder={t('feed.comments.placeholder', { defaultValue: '댓글을 입력하세요' })}
                placeholderTextColor={placeholderColor}
                className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 text-surface-900 dark:text-surface-50"
              />
              <View className="mt-3 flex-row">
                <TouchableOpacity
                  className="mr-2 h-11 flex-1 items-center justify-center rounded-2xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800"
                  onPress={() => setCommentsOpen(false)}
                >
                  <Text className="font-semibold text-surface-700 dark:text-surface-200">{t('common.cancel', { defaultValue: '취소' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`ml-2 h-11 flex-1 items-center justify-center rounded-2xl ${commentDraft.trim() ? 'bg-brand-700' : 'bg-surface-300'}`}
                  onPress={submitComment}
                  disabled={!commentDraft.trim() || commentSubmitting}
                >
                  <Text className="font-semibold text-white">
                    {commentSubmitting
                      ? t('common.loading')
                      : t('feed.comments.submit', { defaultValue: '댓글 등록' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={editOpen} animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditOpen(false)} />
          <View style={modalDialogStyle}>
            <Text className="text-lg font-semibold text-surface-900 dark:text-surface-50">{t('feed.menu.edit', { defaultValue: '수정' })}</Text>
            <TextInput
              value={editCaption}
              onChangeText={setEditCaption}
              className="mt-3 min-h-28 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 text-surface-900 dark:text-surface-50"
              multiline
              textAlignVertical="top"
            />
            <TextInput
              value={editLocation}
              onChangeText={setEditLocation}
              className="mt-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 text-surface-900 dark:text-surface-50"
              placeholder={t('feed.menu.locationPlaceholder', { defaultValue: '위치' })}
              placeholderTextColor={placeholderColor}
            />
            <View className="mt-4 flex-row">
              <TouchableOpacity className="mr-2 h-11 flex-1 items-center justify-center rounded-2xl border border-surface-200 dark:border-surface-700" onPress={() => setEditOpen(false)}>
                <Text className="font-semibold text-surface-700 dark:text-surface-200">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`ml-2 h-11 flex-1 items-center justify-center rounded-2xl ${editCaption.trim() ? 'bg-brand-700' : 'bg-surface-300'}`}
                onPress={saveEditedPost}
                disabled={!editCaption.trim() || editSaving}
              >
                <Text className="font-semibold text-white">{editSaving ? t('common.loading') : t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MetaChip({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  const { isDark } = useResolvedTheme();
  const iconColor = isDark ? '#9fb3c8' : '#4d5d6b';
  return (
    <View className="mb-2 mr-2 flex-row items-center rounded-full border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2">
      <Icon size={14} color={iconColor} />
      <Text className="ml-1 text-xs font-medium text-surface-700 dark:text-surface-200">{text}</Text>
    </View>
  );
}

function buildInlineVideoHtml(url: string) {
  const safeUrl = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" /><style>html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}video{width:100%;height:100%;object-fit:cover;background:#000}</style></head><body><video id="dg_video" controls autoplay playsinline webkit-playsinline preload="metadata"><source src="${safeUrl}" type="video/mp4" /></video><script>const v=document.getElementById('dg_video'); if(v){const p=v.play(); if(p&&p.catch){p.catch(()=>{});}}</script></body></html>`;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(9, 16, 27, 0.45)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#f8fbff',
    maxHeight: '82%',
    paddingTop: 10,
  },
  sheetDark: {
    backgroundColor: '#0f1b2a',
  },
  handle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d8e3ef',
    alignSelf: 'center',
    marginBottom: 10,
  },
  handleDark: {
    backgroundColor: '#30465f',
  },
  dialog: {
    marginHorizontal: 22,
    marginBottom: 34,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbe6f2',
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0b4f8a',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  dialogDark: {
    borderColor: '#2a3e52',
    backgroundColor: '#0f1b2a',
    shadowColor: '#020617',
    shadowOpacity: 0.3,
  },
});
