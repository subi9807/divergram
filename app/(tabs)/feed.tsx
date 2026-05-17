import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useFeed } from '../../src/hooks/useFeed';
import { FeedPost } from '../../src/features/feed/FeedPost';
import { FeedHeader } from '../../src/features/feed/FeedHeader';

export default function FeedScreen() {
  const { t } = useTranslation();
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
      />
    </Screen>
  );
}
