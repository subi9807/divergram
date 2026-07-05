import React from 'react';
import { FlatList, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { FeedAdSlot } from '../../src/features/feed/FeedAdSlot';
import { apiClient, type ActiveAdSlot } from '../../src/lib/api';
import { isAdMobEnabled } from '../../src/config/ads';

type FeedListItem =
  | { type: 'post'; id: string; post: any }
  | { type: 'ad'; id: string; ad: ActiveAdSlot };

export default function FeedScreen() {
  const { t } = useTranslation();
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
  } = useFeed();
  const { data: activeAds = [] } = useQuery<ActiveAdSlot[]>({
    queryKey: ['feed-active-ads'],
    queryFn: () => apiClient.getActiveAdSlots('feed_inline'),
    staleTime: 5 * 60 * 1000,
  });

  const posts = data?.pages.flatMap((page) => page.data) ?? [];
  const usableAds = activeAds.filter((ad) => ad.isActive && ['ready', 'active'].includes(String(ad.status || '').toLowerCase()));
  const hasFallbackAdOnly = usableAds.length === 0 && isAdMobEnabled();
  const fallbackAds: ActiveAdSlot[] = usableAds.length || !isAdMobEnabled()
    ? []
    : [
        {
          id: 'fallback-admob-feed',
          title: t('feed.ad.defaultTitle', { defaultValue: 'Divergram 추천 광고' }),
          placement: 'feed_inline',
          status: 'active',
          note: t('feed.ad.defaultSubtitle', { defaultValue: 'AdMob 배너가 연결되면 이 슬롯에 표시됩니다.' }),
          actionLabel: t('feed.ad.cta', { defaultValue: '자세히 보기' }),
          isActive: true,
          sortOrder: 0,
        },
      ];
  const resolvedAds = [...usableAds, ...fallbackAds];
  const feedItems = React.useMemo<FeedListItem[]>(() => {
    return posts.reduce<FeedListItem[]>((items, post, index) => {
      items.push({ type: 'post', id: `post-${post.id}`, post });
      const shouldInsertAd =
        resolvedAds.length > 0 &&
        ((hasFallbackAdOnly && index === 0) || (index + 1) % 3 === 0);
      if (shouldInsertAd) {
        const ad = resolvedAds[Math.floor(index / 3) % resolvedAds.length];
        if (ad) {
          items.push({ type: 'ad', id: `ad-${ad.id}-${Math.floor(index / 3)}`, ad });
        }
      }
      return items;
    }, []);
  }, [hasFallbackAdOnly, posts, resolvedAds]);

  const renderPost = ({ item }: { item: FeedListItem }) => {
    if (item.type === 'ad') {
      return (
        <FeedAdSlot
          label={item.ad.title}
          subtitle={item.ad.note || '운영에서 활성화한 광고 슬롯입니다. 설정에 따라 실제 광고 또는 캠페인 카드가 노출됩니다.'}
          ctaLabel={item.ad.actionLabel || '자세히 보기'}
          onPress={item.ad.targetUrl ? () => Linking.openURL(item.ad.targetUrl as string).catch(() => {}) : undefined}
        />
      );
    }
    return <FeedPost post={item.post} />;
  };

  const onEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (error) {
    return (
      <Screen>
        <EmptyState
          title={t('feed.error')}
          subtitle={t('feed.errorSubtitle')}
          actionText={t('common.retry')}
          onAction={refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <LoadingOverlay visible={isLoading && !posts.length} />
      <View style={styles.container}>
        <FlatList
          data={feedItems}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                title={t('feed.empty')}
                subtitle={t('feed.emptySubtitle')}
              />
            ) : null
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: fabBottom + 84 }}
        />
        <TouchableOpacity
          activeOpacity={0.9}
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
});
