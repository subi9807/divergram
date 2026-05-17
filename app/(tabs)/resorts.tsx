import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Star, Store, Waves } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';

export default function ResortsScreen() {
  const { t } = useTranslation();
  const fallbackResorts = [{ id: 'fallback', name: t('resorts.loadingName'), area: 'Divergram', rating: 0, reviewCount: 0, tags: t('resorts.loadingTag') }];
  const { data: resorts = fallbackResorts } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 pt-4 pb-5 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('resorts.title')}</Text>
          <Text className="mt-1 text-gray-500">{t('resorts.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <View className="rounded-3xl bg-gray-950 p-5">
            <View className="h-12 w-12 rounded-2xl bg-white items-center justify-center">
              <Store size={24} color="#111827" />
            </View>
            <Text className="mt-4 text-2xl font-bold text-white">{t('resorts.heroTitle')}</Text>
            <Text className="mt-2 text-gray-300 leading-5">{t('resorts.heroSubtitle')}</Text>
          </View>
        </View>

        <View className="px-5">
          {resorts.map((item) => (
            <TouchableOpacity key={item.id} className="mb-4 rounded-3xl border border-gray-200 bg-white p-4">
              <View className="flex-row">
                <View className="h-24 w-24 rounded-3xl bg-gray-100 items-center justify-center">
                  <Waves size={28} color="#111827" />
                </View>
                <View className="ml-4 flex-1">
                  <View className="flex-row items-start justify-between">
                    <Text className="flex-1 text-lg font-semibold text-gray-950">{item.name}</Text>
                    <View className="ml-2 flex-row items-center rounded-full bg-gray-100 px-2 py-1">
                      <Star size={13} color="#111827" />
                      <Text className="ml-1 text-xs font-semibold text-gray-800">{item.rating ? item.rating.toFixed(1) : '-'}</Text>
                    </View>
                  </View>
                  <View className="mt-2 flex-row items-center">
                    <MapPin size={15} color="#6b7280" />
                    <Text className="ml-1 text-sm text-gray-600">{item.area}</Text>
                  </View>
                  <Text className="mt-3 text-sm text-gray-500">{item.tags}{item.reviewCount ? ` · ${t('resorts.reviews', { count: item.reviewCount })}` : ''}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
