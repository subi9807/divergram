import React from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useFeed } from '../../src/hooks/useFeed';
import { appRouteMap } from '../../src/config/sitemap';
import { FeedPost } from '../../src/features/feed/FeedPost';
import { FeedIntro } from '../../src/features/feed/FeedIntro';
import { FeedAdSlot } from '../../src/features/feed/FeedAdSlot';
import { MarineLifeFeedCard } from '../../src/features/feed/MarineLifeFeedCard';
import { DiscoveryFeedCard, type FeedResort } from '../../src/features/feed/DiscoveryFeedCard';
import { mixDiscoveryItems } from '../../src/features/feed/mixDiscoveryItems';
import { apiClient, type ActiveAdSlot, type MarineLifeFeedItem, type DiveGuide } from '../../src/lib/api';
import { isAdMobEnabled } from '../../src/config/ads';
import { getLayoutPreviewPayload, isLayoutPreviewEnabled } from '../../src/lib/layoutPreview';

type FeedListItem =
  | { type: 'post'; id: string; post: any }
  | { type: 'ad'; id: string; ad: ActiveAdSlot }
  | { type: 'marine'; id: string; sighting: MarineLifeFeedItem }
  | { type: 'resort'; id: string; resort: FeedResort }
  | { type: 'guide'; id: string; guide: DiveGuide };

function pickAdForSlot(ads: ActiveAdSlot[], slotIndex: number, previousAdId?: string) {
  if (ads.length === 0) return null;
  if (ads.length === 1) return ads[0];

  const baseIndex = slotIndex % ads.length;
  let selected = ads[baseIndex];

  if (selected?.id === previousAdId) {
    selected = ads[(baseIndex + 1) % ads.length];
  }

  return selected ?? null;
}

export default function FeedScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = insets.bottom + 76;
  const fabBottom = Math.max(tabBarHeight - 42, insets.bottom - 2);
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefreshing,
  } = useFeed();
  const language = (i18n.resolvedLanguage || i18n.language).split('-')[0];
  const locale = language === 'ko' || language === 'ja' || language === 'zh' ? language : 'en';
  const resortsQuery = useQuery({
    queryKey: ['resorts'], queryFn: apiClient.getResorts,
    staleTime: 5 * 60 * 1000, enabled: !isLayoutPreviewEnabled(),
  });
  const guidesQuery = useQuery({
    queryKey: ['feed-guides', locale], queryFn: () => apiClient.getDiveGuides(locale),
    staleTime: 2 * 60 * 1000, enabled: !isLayoutPreviewEnabled(),
  });
  const [refreshingAll, setRefreshingAll] = React.useState(false);
  const { data: activeAds = [] } = useQuery<ActiveAdSlot[]>({
    queryKey: ['feed-active-ads'],
    queryFn: () => apiClient.getActiveAdSlots('feed_inline'),
    staleTime: 5 * 60 * 1000,
  });
  const { data: marineLife = [], refetch: refetchMarineLife } = useQuery<MarineLifeFeedItem[]>({
    queryKey: ['feed-marine-life'],
    queryFn: () => apiClient.getMarineLifeFeed(24),
    staleTime: 2 * 60 * 1000,
    enabled: !isLayoutPreviewEnabled(),
  });

  const livePosts = data?.pages.flatMap((page) => page.data) ?? [];
  const captureLocale = getLayoutPreviewPayload()?.locale || 'ko';
  const captureT = i18n.getFixedT(captureLocale);
  const captureCopy = [captureT('feed.preview.reef'), captureT('feed.preview.freediving')];
  const previewPosts = [
    { id: 'capture-reef', user: { id: 'capture-a', name: 'Mina Ocean', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300' }, content: captureCopy[0], image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200', media: [{ id: 'reef', type: 'image', url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200', order: 0 }], likes: 128, comments: 23, createdAt: '2026-08-10T08:30:00Z', location: 'Bali, Indonesia', diveType: 'scuba' },
    { id: 'capture-blue', user: { id: 'capture-b', name: 'Alex Blue' }, content: captureCopy[1], image: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200', media: [{ id: 'blue', type: 'image', url: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200', order: 0 }], likes: 96, comments: 17, createdAt: '2026-08-09T04:10:00Z', location: 'Okinawa, Japan', diveType: 'freediving' },
  ];
  const posts = isLayoutPreviewEnabled() ? previewPosts : livePosts;
  const resolvedAds = React.useMemo<ActiveAdSlot[]>(() => {
    const usableAds = activeAds.filter((ad) => ad.isActive && ['ready', 'active'].includes(String(ad.status || '').toLowerCase()));
    const shouldUseFallbackAd = !isLayoutPreviewEnabled() && usableAds.length === 0 && (__DEV__ || isAdMobEnabled());
    const fallbackAds: ActiveAdSlot[] = usableAds.length || !shouldUseFallbackAd ? [] : [
        {
          id: 'fallback-admob-feed',
          title: t('feed.ad.defaultTitle'),
          placement: 'feed_inline',
          status: 'active',
          note: t('feed.ad.defaultSubtitle'),
          actionLabel: t('feed.ad.cta'),
          isActive: true,
          sortOrder: 0,
        },
      ];
    return [...usableAds, ...fallbackAds];
  }, [activeAds, t]);
  const feedItems = React.useMemo<FeedListItem[]>(() => {
    const items: FeedListItem[] = [];
    let adSlotIndex = 0;
    let previousAdId: string | undefined;

    posts.forEach((post, index) => {
      items.push({ type: 'post', id: `post-${post.id}-${index}`, post });

      if (!isLayoutPreviewEnabled() && resolvedAds.length > 0 && (index + 1) % 3 === 0) {
        const ad = pickAdForSlot(resolvedAds, adSlotIndex, previousAdId);
        if (ad) {
          items.push({ type: 'ad', id: `ad-${ad.id}-${adSlotIndex}-${index}`, ad });
          previousAdId = ad.id;
          adSlotIndex += 1;
        }
      }

    });
    if (isLayoutPreviewEnabled()) return items;
    return mixDiscoveryItems<FeedListItem>(items, [
      marineLife.map(sighting => ({ type: 'marine', id: `marine-${sighting.id}`, sighting })),
      (guidesQuery.data?.data || []).map(guide => ({ type: 'guide', id: `guide-${guide.id}`, guide })),
      (resortsQuery.data || []).filter(resort => !!resort.coverUrl).slice(0, 12)
        .map(resort => ({ type: 'resort', id: `resort-${resort.id}`, resort })),
    ]);
  }, [marineLife, posts, resolvedAds, guidesQuery.data, resortsQuery.data]);

  const renderPost = ({ item }: { item: FeedListItem }) => {
    if (item.type === 'ad') {
      return (
        <FeedAdSlot
          label={item.ad.title}
          subtitle={item.ad.note || t('feed.ad.defaultSubtitle')}
          ctaLabel={item.ad.actionLabel || t('feed.ad.cta')}
          onPress={item.ad.targetUrl ? () => Linking.openURL(item.ad.targetUrl as string).catch(() => {}) : undefined}
        />
      );
    }
    if (item.type === 'marine') {
      return <MarineLifeFeedCard sighting={item.sighting} />;
    }
    if (item.type === 'guide') return <DiscoveryFeedCard guide={item.guide} />;
    if (item.type === 'resort') return <DiscoveryFeedCard resort={item.resort} />;
    return <FeedPost post={item.post} />;
  };

  const handleRefresh = async () => {
    setRefreshingAll(true);
    try {
      await Promise.all([refetch(), refetchMarineLife(), resortsQuery.refetch(), guidesQuery.refetch()]);
    } finally { setRefreshingAll(false); }
  };

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (error && !posts.length) {
    return (
      <Screen safe={false}>
        <View style={styles.errorState}>
          <EmptyState
            title={t('feed.error')}
            subtitle={t('feed.errorSubtitle')}
            actionText={t('common.retry')}
            onAction={refetch}
          />
          {!isLayoutPreviewEnabled() && (__DEV__ || isAdMobEnabled()) ? (
            <FeedAdSlot
              label={t('feed.ad.sponsored')}
              subtitle={t('feed.ad.errorSubtitle')}
              ctaLabel={t('feed.ad.cta')}
            />
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen safe={false}>
      <LoadingOverlay visible={isLoading && !posts.length} />
      <View style={styles.container}>
        <FlatList
          data={feedItems}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<><FeedIntro />{error ? <TouchableOpacity accessibilityRole="button" onPress={() => void refetch()} style={{ margin: 16, padding: 14, borderRadius: 12, backgroundColor: '#fff3e8' }}><Text style={{ color: '#87521f', lineHeight: 21 }}>{t('feed.errorSubtitle')} · {t('common.retry')}</Text></TouchableOpacity> : null}</>}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                title={t('feed.empty')}
                subtitle={t('feed.emptySubtitle')}
                actionText={t('tabs.create')}
                onAction={() => router.push(appRouteMap.create.path as never)}
              />
            ) : null
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.1}
          refreshControl={<RefreshControl refreshing={isRefreshing || refreshingAll} onRefresh={handleRefresh} tintColor="#0d5fa8" colors={['#0d5fa8']} />}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.pageLoader} color="#0d5fa8" /> : null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: fabBottom + 84 }}
        />
        <TouchableOpacity
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.create')}
          onPress={() => router.push(appRouteMap.create.path as never)}
          style={[styles.fab, { bottom: fabBottom }]}
        >
          <Camera size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d5fa8',
    shadowColor: '#0b4f8a',
    shadowOpacity: 0.34,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  pageLoader: {
    marginVertical: 24,
  },
});
