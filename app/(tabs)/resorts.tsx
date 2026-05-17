import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Star, Store, Waves } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';

export default function ResortsScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'top' | 'reviewed'>('all');
  const fallbackResorts = [{ id: 'fallback', name: t('resorts.loadingName'), area: 'Divergram', rating: 0, reviewCount: 0, tags: t('resorts.loadingTag') }];
  const { data: resorts = fallbackResorts } = useQuery({ queryKey: ['resorts'], queryFn: apiClient.getResorts });
  const filters = [
    { key: 'all' as const, label: t('resorts.filters.all') },
    { key: 'top' as const, label: t('resorts.filters.top') },
    { key: 'reviewed' as const, label: t('resorts.filters.reviewed') },
  ];
  const filteredResorts = useMemo(() => {
    if (filter === 'top') return resorts.filter((item) => Number(item.rating || 0) >= 4.5);
    if (filter === 'reviewed') return resorts.filter((item) => Number(item.reviewCount || 0) > 0);
    return resorts;
  }, [filter, resorts]);
  const list = filteredResorts.length ? filteredResorts : resorts;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 pb-5 pt-4">
          <Text className="text-2xl font-bold text-surface-900">{t('resorts.title')}</Text>
          <Text className="mt-1 text-surface-500">{t('resorts.subtitle')}</Text>
        </View>

        <View className="px-5 pb-5">
          <LinearGradient colors={['#0d5fa8', '#1198f5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-3xl p-5">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/90">
              <Store size={24} color="#0d5fa8" />
            </View>
            <Text className="mt-4 text-2xl font-bold text-white">{t('resorts.heroTitle')}</Text>
            <Text className="mt-2 leading-5 text-blue-100">{t('resorts.heroSubtitle')}</Text>
          </LinearGradient>
        </View>

        <View className="px-5 pb-3">
          <View className="flex-row">
            {filters.map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.86}
                onPress={() => setFilter(item.key)}
                className={`mr-2 rounded-full px-4 py-2 ${filter === item.key ? 'bg-brand-600' : 'border border-surface-200 bg-white'}`}
              >
                <Text className={`text-sm font-semibold ${filter === item.key ? 'text-white' : 'text-surface-700'}`}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="px-5">
          {list.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.92} className="mb-4 rounded-3xl border border-surface-200 bg-white p-4 shadow-sm shadow-surface-200">
              <View className="flex-row">
                <View className="h-24 w-24 items-center justify-center rounded-3xl bg-brand-50">
                  <Waves size={28} color="#0d5fa8" />
                </View>
                <View className="ml-4 flex-1">
                  <View className="flex-row items-start justify-between">
                    <Text className="flex-1 text-lg font-semibold text-surface-900">{item.name}</Text>
                    <View className="ml-2 flex-row items-center rounded-full bg-surface-100 px-2 py-1">
                      <Star size={13} color="#1e293b" />
                      <Text className="ml-1 text-xs font-semibold text-surface-800">{item.rating ? item.rating.toFixed(1) : '-'}</Text>
                    </View>
                  </View>
                  <View className="mt-2 flex-row items-center">
                    <MapPin size={15} color="#64748b" />
                    <Text className="ml-1 text-sm text-surface-600">{item.area}</Text>
                  </View>
                  <View className="mt-3 flex-row items-center">
                    <View className="rounded-full bg-surface-100 px-3 py-1">
                      <Text className="text-xs font-semibold text-surface-700">
                        {String(item.tags || t('resorts.loadingTag')).replace(/^https?:\/\//, '').split(/[/?#]/)[0]}
                      </Text>
                    </View>
                    {item.reviewCount ? <Text className="ml-2 text-xs text-surface-500">{t('resorts.reviews', { count: item.reviewCount })}</Text> : null}
                  </View>
                  <View className="mt-3 flex-row">
                    <View className="rounded-full bg-brand-600 px-3 py-1">
                      <Text className="text-xs font-semibold text-white">{t('resorts.cta')}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
