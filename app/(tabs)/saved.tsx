import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { useFeed } from '../../src/hooks/useFeed';

export default function SavedScreen() {
  const { t } = useTranslation();
  const { data } = useFeed();
  const posts = (data?.pages.flatMap((page) => page.data) ?? []).slice(0, 8);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.saved')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.saved.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          {posts.map((post) => (
            <View key={post.id} className="mb-3 rounded-3xl border border-gray-200 bg-white p-4">
              <View className="flex-row items-center justify-between">
                <Text className="flex-1 text-sm font-semibold text-gray-900">{post.content || t('pages.saved.noCaption')}</Text>
                <Bookmark size={16} color="#111827" />
              </View>
              <Text className="mt-1 text-xs text-gray-500">{post.user.name}{post.location ? ` · ${post.location}` : ''}</Text>
            </View>
          ))}
          {posts.length === 0 ? <Text className="text-center text-gray-500">{t('pages.saved.empty')}</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
