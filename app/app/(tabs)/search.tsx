import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';

export default function SearchScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState('');
  const normalizedQuery = q.trim().replace(/^@+/, '');
  const { data: searchBase = [] } = useQuery({ queryKey: ['search-base'], queryFn: apiClient.getExplore });
  const { data: profileResults = [] } = useQuery({
    queryKey: ['profile-search', normalizedQuery],
    queryFn: () => apiClient.searchProfiles(normalizedQuery),
    enabled: normalizedQuery.length >= 2,
  });
  const normalizedSearchBase = Array.isArray(searchBase)
    ? searchBase
        .filter((item) => item && typeof item === 'object')
        .map((item: any, index: number) => ({
          title: String(item.title || t('api.explore.defaultTitle')),
          location: String(item.location || ''),
          meta: String(item.meta || ''),
          key: `${String(item.location || 'location')}-${String(item.title || 'title')}-${index}`,
        }))
    : [];
  const data = normalizedSearchBase;

  useEffect(() => {
    const incoming = String(params.q || '').trim();
    if (incoming) setQ(incoming);
  }, [params.q]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return data.filter((item) => `${item.title} ${item.location} ${item.meta}`.toLowerCase().includes(query));
  }, [data, q]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950 dark:text-surface-50">{t('tabs.search')}</Text>
          <View className="mt-3 h-12 rounded-2xl bg-gray-100 dark:bg-surface-800 px-4 flex-row items-center">
            <Search size={18} color="#6b7280" />
            <TextInput
              className="ml-2 flex-1 text-gray-950 dark:text-surface-50"
              placeholder={t('pages.search.placeholder')}
              placeholderTextColor="#9ca3af"
              value={q}
              onChangeText={setQ}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View className="px-5 py-5">
          {profileResults.length > 0 ? (
            <View className="mb-5">
              <Text className="mb-3 text-sm font-semibold text-gray-500">
                {t('pages.search.people', { defaultValue: '다이버' })}
              </Text>
              {profileResults.map((profile: any) => (
                <View key={String(profile.id)} className="mb-2 flex-row items-center rounded-2xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-3">
                  {profile.avatar_url ? (
                    <Image source={{ uri: String(profile.avatar_url) }} className="h-12 w-12 rounded-full bg-gray-100" />
                  ) : (
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                      <Text className="font-semibold text-brand-700">{String(profile.full_name || profile.username || 'D').slice(0, 1)}</Text>
                    </View>
                  )}
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-gray-950 dark:text-surface-50">{profile.full_name || profile.username}</Text>
                    <Text className="mt-0.5 text-sm text-gray-500">@{profile.username}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {results.map((item) => (
            <TouchableOpacity key={item.key} className="mb-3 rounded-3xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4">
              <Text className="text-base font-semibold text-gray-950 dark:text-surface-50">{item.title}</Text>
              <Text className="mt-1 text-sm text-gray-500">{item.meta}</Text>
              <Text className="mt-2 text-sm text-gray-600">📍 {item.location}</Text>
            </TouchableOpacity>
          ))}
          {results.length === 0 && profileResults.length === 0 ? <Text className="text-center text-gray-500">{t('pages.search.empty')}</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
