import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { useFeed } from '../../src/hooks/useFeed';
import { FeedPost } from '../../src/features/feed/FeedPost';
import { apiClient } from '../../src/lib/api';

export default function PostScreen() {
  const { t } = useTranslation();
  const { post: postId } = useLocalSearchParams<{ post?: string }>();
  const { data } = useFeed();
  const posts = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data?.pages]);
  const safePostId = String(postId || '').trim();

  const { data: remotePost } = useQuery({
    queryKey: ['post-detail', safePostId],
    enabled: Boolean(safePostId),
    queryFn: () => apiClient.getPostById(safePostId),
  });

  const target = useMemo(() => {
    if (remotePost) return remotePost;
    if (!safePostId) return posts[0];
    return posts.find((p) => p.id === safePostId) || posts[0];
  }, [posts, remotePost, safePostId]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.post')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.post.subtitle')}</Text>
        </View>

        <View className="pt-4">
          {target ? <FeedPost post={target} /> : <Text className="text-center text-gray-500">{t('pages.post.empty')}</Text>}
        </View>
      </ScrollView>
    </Screen>
  );
}
