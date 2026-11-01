import React, { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { Film, Heart, MapPin, MessageCircle, Pause, Play, Send, Volume2, VolumeX } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { appRouteMap } from '../../src/config/sitemap';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/components/Toast';
import { buildShareUrl } from '../../src/lib/shareLinks';

const reelGradients: [string, string][] = [
  ['#072f54', '#0d5fa8'],
  ['#0a3a63', '#1198f5'],
  ['#062a48', '#0e70bf'],
];

export default function ReelsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { reelId = '' } = useLocalSearchParams<{ reelId?: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 76;
  const reelHeight = Math.max(windowHeight - tabBarHeight, 1);
  const headerTop = insets.top + 12;
  const actionsBottom = insets.bottom + 108;
  const detailsBottom = insets.bottom + 24;
  const playerRef = useRef<WebView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likedById, setLikedById] = useState<Record<string, boolean>>({});
  const [likeCountById, setLikeCountById] = useState<Record<string, number>>({});
  const [likePendingId, setLikePendingId] = useState<string | null>(null);
  const [messagePendingId, setMessagePendingId] = useState<string | null>(null);

  const { data: reelPosts = [] } = useQuery({ queryKey: ['reels'], queryFn: apiClient.getReels });

  const reels = reelPosts.map((post: any) => {
    const media = Array.isArray(post.media) ? post.media : [];
    const video = media.find((item: any) => item?.type === 'video');
    return {
        id: String(post.id),
        authorId: String(post.user?.id || ''),
        title: String(post.content || post.location || t('tabs.reels')).split('\n')[0],
        author: String(post.user?.name || 'Diver'),
        likes: String(post.likes || 0),
        shares: t('reelsScreen.share'),
        tag: String(post.diveSite || post.location || 'Dive'),
        latitude: Number.isFinite(Number(post.locationLat)) ? Number(post.locationLat) : null,
        longitude: Number.isFinite(Number(post.locationLng)) ? Number(post.locationLng) : null,
        videoUrl: String(video?.url || ''),
      };
  });
  const activeReelId = reels[activeIndex]?.id || '';

  const targetReelIndex = reelId ? reels.findIndex((item) => item.id === String(reelId)) : -1;

  useEffect(() => {
    if (targetReelIndex < 0) return;
    setActiveIndex(targetReelIndex);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: targetReelIndex * reelHeight, animated: false }));
  }, [reelHeight, targetReelIndex]);

  useEffect(() => {
    setIsPlaying(true);
  }, [activeIndex]);

  useEffect(() => {
    if (!activeReelId || !user?.id) return;
    let canceled = false;
    void apiClient.isPostLikedByUser(activeReelId, user.id).then((liked) => {
      if (canceled) return;
      setLikedById((current) => ({ ...current, [activeReelId]: liked }));
    }).catch(() => undefined);
    return () => {
      canceled = true;
    };
  }, [activeReelId, user?.id]);

  const sendPlayerCommand = (command: string) => {
    playerRef.current?.injectJavaScript(`${command}; true;`);
  };

  const togglePlayback = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    sendPlayerCommand(next ? 'window.dgVideoPlay()' : 'window.dgVideoPause()');
  };

  const toggleMuted = () => {
    const next = !isMuted;
    setIsMuted(next);
    sendPlayerCommand(`window.dgVideoMuted(${next ? 'true' : 'false'})`);
  };

  const handleScrollBegin = () => {
    sendPlayerCommand('window.dgVideoPause()');
    setIsPlaying(false);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.max(0, Math.min(reels.length - 1, Math.round(event.nativeEvent.contentOffset.y / reelHeight)));
    setActiveIndex(nextIndex);
    setIsPlaying(true);
  };

  const handleLike = async (item: (typeof reels)[number]) => {
    if (!user?.id || likePendingId) return;
    const previousLiked = Boolean(likedById[item.id]);
    const previousCount = likeCountById[item.id] ?? Number(item.likes || 0);
    const nextLiked = !previousLiked;
    setLikePendingId(item.id);
    setLikedById((current) => ({ ...current, [item.id]: nextLiked }));
    setLikeCountById((current) => ({ ...current, [item.id]: Math.max(0, previousCount + (nextLiked ? 1 : -1)) }));
    try {
      const result = await apiClient.togglePostLike(item.id, user.id);
      setLikedById((current) => ({ ...current, [item.id]: result.liked }));
      setLikeCountById((current) => ({ ...current, [item.id]: result.count }));
    } catch {
      setLikedById((current) => ({ ...current, [item.id]: previousLiked }));
      setLikeCountById((current) => ({ ...current, [item.id]: previousCount }));
      showToast({ type: 'error', title: t('reelsScreen.likeFailed') });
    } finally {
      setLikePendingId(null);
    }
  };

  const openAuthor = (authorId: string) => {
    if (!authorId) return;
    router.push(`${appRouteMap.account.path}?userId=${encodeURIComponent(authorId)}` as never);
  };

  const openPoint = (item: (typeof reels)[number]) => {
    const query = new URLSearchParams({ location: item.tag });
    if (item.latitude != null && item.longitude != null) {
      query.set('lat', String(item.latitude));
      query.set('lng', String(item.longitude));
    }
    router.push(`${appRouteMap.location.path}?${query.toString()}` as never);
  };

  const openMessages = async (authorId: string) => {
    if (!user?.id) {
      showToast({ type: 'info', title: t('reelsScreen.loginToMessage') });
      return;
    }
    if (!authorId || authorId === user.id) {
      router.push(appRouteMap.messages.path as never);
      return;
    }

    setMessagePendingId(authorId);
    try {
      const room = await apiClient.getOrCreateDirectRoom(authorId);
      if (!room?.id) throw new Error('Direct message room was not created');
      router.push(
        `${appRouteMap.messages.path}?roomId=${encodeURIComponent(String(room.id))}&userId=${encodeURIComponent(authorId)}` as never
      );
    } catch {
      showToast({ type: 'error', title: t('reelsScreen.messageOpenFailed') });
    } finally {
      setMessagePendingId(null);
    }
  };

  const shareReel = async (item: (typeof reels)[number]) => {
    const url = buildShareUrl('reel', item.id);
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n${url}`,
        url,
      });
    } catch {
      showToast({ type: 'error', title: t('reelsScreen.shareFailed') });
    }
  };

  return (
    <Screen safe={false} fullBleed tone="plain" style={{ backgroundColor: '#04111f' }}>
      <ScrollView
        ref={scrollRef}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={reelHeight}
        snapToAlignment="start"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {reels.length === 0 ? (
          <View style={[styles.reel, { height: reelHeight, alignItems: 'center', justifyContent: 'center' }]}>
            <Film size={40} color="#7dd3fc" />
            <Text className="mt-4 text-base font-semibold text-white">{t('reelsScreen.empty')}</Text>
          </View>
        ) : null}
        {reels.map((item, index) => (
          <LinearGradient
            key={`${item.id}-${index}`}
            colors={reelGradients[index % reelGradients.length]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.reel, { height: reelHeight }]}
          >
            {item.videoUrl && index === activeIndex ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <WebView
                  ref={playerRef}
                  source={{ html: buildReelVideoHtml(item.videoUrl) }}
                  style={styles.video}
                  originWhitelist={['*']}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  scrollEnabled={false}
                  bounces={false}
                  onLoadEnd={() => {
                    sendPlayerCommand(`window.dgVideoMuted(${isMuted ? 'true' : 'false'})`);
                    sendPlayerCommand(isPlaying ? 'window.dgVideoPlay()' : 'window.dgVideoPause()');
                  }}
                />
              </View>
            ) : null}

            {!item.videoUrl ? (
              <View className="absolute inset-0 items-center justify-center">
                <TouchableOpacity
                  activeOpacity={0.9}
                  className="h-20 w-20 items-center justify-center rounded-full bg-white/20"
                  onPress={() => router.push(`${appRouteMap.post.path}?post=${encodeURIComponent(item.id)}` as never)}
                >
                  <Play size={38} color="#ffffff" fill="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : null}

            {index === activeIndex && item.videoUrl ? (
              <View style={[styles.playerControls, { top: headerTop }]}>
                <TouchableOpacity
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityLabel={t(isPlaying ? 'reelsScreen.pauseVideo' : 'reelsScreen.playVideo')}
                  onPress={togglePlayback}
                  style={styles.playerControlButton}
                >
                  {isPlaying ? <Pause size={20} color="#FFFFFF" fill="#FFFFFF" /> : <Play size={20} color="#FFFFFF" fill="#FFFFFF" />}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.86}
                  accessibilityRole="button"
                  accessibilityLabel={t(isMuted ? 'reelsScreen.unmute' : 'reelsScreen.mute')}
                  onPress={toggleMuted}
                  style={styles.playerControlButton}
                >
                  {isMuted ? <VolumeX size={21} color="#FFFFFF" /> : <Volume2 size={21} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>
            ) : null}

            <View className="absolute right-4 items-center" style={{ bottom: actionsBottom }}>
              <Action
                icon={<Heart size={24} color="#ffffff" fill={likedById[item.id] ? '#ef4444' : 'transparent'} />}
                value={String(likeCountById[item.id] ?? item.likes)}
                onPress={() => void handleLike(item)}
                disabled={likePendingId === item.id}
              />
              <Action
                icon={<MessageCircle size={24} color="#ffffff" />}
                value={t('reelsScreen.message')}
                onPress={() => void openMessages(item.authorId)}
                disabled={messagePendingId === item.authorId}
              />
              <Action icon={<Send size={24} color="#ffffff" />} value={item.shares} onPress={() => void shareReel(item)} />
            </View>

            <View style={[styles.reelDetails, { bottom: detailsBottom }]}>
              <TouchableOpacity activeOpacity={0.82} onPress={() => openAuthor(item.authorId)}>
                <Text style={styles.authorText}>@{item.author}</Text>
              </TouchableOpacity>
              <Text style={styles.titleText} numberOfLines={2}>{item.title}</Text>
              {item.tag ? (
                <TouchableOpacity
                  activeOpacity={0.78}
                  accessibilityRole="button"
                  accessibilityLabel={t('reelsScreen.viewPointOnMap', { point: item.tag })}
                  onPress={() => openPoint(item)}
                  style={styles.locationRow}
                >
                  <MapPin size={14} color="#E0F2FE" />
                  <Text style={styles.locationText} numberOfLines={1}>{item.tag}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </LinearGradient>
        ))}
      </ScrollView>
    </Screen>
  );
}

function buildReelVideoHtml(url: string) {
  const safeUrl = String(url || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    <style>
      html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#04111f}
      video{width:100%;height:100%;object-fit:cover;background:#04111f}
    </style>
  </head>
  <body>
    <video id="dg_reel_video" autoplay muted loop playsinline webkit-playsinline preload="auto" src="${safeUrl}"></video>
    <script>
      const video = document.getElementById('dg_reel_video');
      window.dgVideoPlay = () => { if (video) { const result = video.play(); if (result && result.catch) result.catch(() => {}); } };
      window.dgVideoPause = () => { if (video) video.pause(); };
      window.dgVideoMuted = (muted) => { if (video) video.muted = Boolean(muted); };
      window.dgVideoPlay();
    </script>
  </body>
</html>`;
}

function Action({
  icon,
  value,
  onPress,
  disabled = false,
}: {
  icon: React.ReactNode;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={0.78} className="mb-5 items-center" onPress={onPress} disabled={disabled}>
      <View className="h-12 w-12 items-center justify-center rounded-full bg-white/15">
        {icon}
      </View>
      <Text className="mt-1 text-xs font-semibold text-white">{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  reel: {
    width: '100%',
    overflow: 'hidden',
  },
  video: {
    flex: 1,
    backgroundColor: '#04111f',
  },
  playerControls: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  playerControlButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  reelDetails: {
    position: 'absolute',
    left: 16,
    right: 96,
  },
  authorText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  titleText: {
    marginTop: 7,
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.78)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  locationRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    flexShrink: 1,
    color: '#E0F2FE',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
