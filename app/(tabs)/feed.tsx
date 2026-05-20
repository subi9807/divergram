import React from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useFeed } from '../../src/hooks/useFeed';
import { appRouteMap } from '../../src/config/sitemap';
import { FeedPost } from '../../src/features/feed/FeedPost';
import { FeedHeader } from '../../src/features/feed/FeedHeader';

export default function FeedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const fabBottom = Math.max(tabBarHeight + 10, insets.bottom + 88);
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefreshing
  } = useFeed();

  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  const renderPost = ({ item }: { item: any }) => <FeedPost post={item} />;

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
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<FeedHeader />}
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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => refetch()}
              tintColor="#1198f5"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: fabBottom + 84 }}
        />
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(appRouteMap.create.path as never)}
          style={[styles.fab, { bottom: fabBottom }]}
        >
          <Plus size={26} color="#ffffff" />
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
