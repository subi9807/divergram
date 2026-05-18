import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { exploreSampleCards } from '../../src/mock/menuSamples';

export default function SearchScreen() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const { data: searchBase = [] } = useQuery({ queryKey: ['search-base'], queryFn: apiClient.getExplore });
  const data = searchBase.length ? searchBase : exploreSampleCards;

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return data.filter((item) => `${item.title} ${item.location} ${item.meta}`.toLowerCase().includes(query));
  }, [data, q]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.search')}</Text>
          <View className="mt-3 h-12 rounded-2xl bg-gray-100 px-4 flex-row items-center">
            <Search size={18} color="#6b7280" />
            <TextInput
              className="ml-2 flex-1 text-gray-950"
              placeholder={t('pages.search.placeholder')}
              placeholderTextColor="#9ca3af"
              value={q}
              onChangeText={setQ}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View className="px-5 py-5">
          {results.map((item) => (
            <TouchableOpacity key={item.title} className="mb-3 rounded-3xl border border-gray-200 bg-white p-4">
              <Text className="text-base font-semibold text-gray-950">{item.title}</Text>
              <Text className="mt-1 text-sm text-gray-500">{item.meta}</Text>
              <Text className="mt-2 text-sm text-gray-600">📍 {item.location}</Text>
            </TouchableOpacity>
          ))}
          {results.length === 0 ? <Text className="text-center text-gray-500">{t('pages.search.empty')}</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
