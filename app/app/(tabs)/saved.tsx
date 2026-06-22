import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { apiClient } from '../../src/lib/api';
import { FeedPost } from '../../src/features/feed/FeedPost';

export default function SavedScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    data: posts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['saved-feed', user?.id],
    queryFn: () => apiClient.getSavedFeed(String(user?.id || '')),
    enabled: Boolean(user?.id),
  });

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.saved')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.saved.subtitle')}</Text>
          <TouchableOpacity className="mt-3 self-start rounded-full bg-blue-50 px-3 py-1.5" onPress={() => refetch()} activeOpacity={0.85}>
            <Text className="text-xs font-semibold text-blue-700">{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>

        <View className="pt-4">
          {isLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator color="#0d5fa8" />
            </View>
          ) : null}

          {!isLoading && posts.length === 0 ? (
            <Text className="px-5 py-10 text-center text-gray-500">{t('pages.saved.empty')}</Text>
          ) : null}

          {!isLoading
            ? posts.map((post: any) => <FeedPost key={post.id} post={post} />)
            : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
