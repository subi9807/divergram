import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Waves } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { exploreSampleCards } from '../../src/mock/menuSamples';

export default function LocationScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ location?: string }>();
  const selectedLocation = String(params.location || '').trim();
  const normalizedSelected = selectedLocation.toLowerCase();
  const { data: locationFeed = [] } = useQuery({ queryKey: ['location-feed'], queryFn: apiClient.getExplore });
  const locationRows = Array.isArray(locationFeed)
    ? locationFeed
        .filter((item) => item && typeof item === 'object')
        .map((item: any, index: number) => ({
          title: String(item.title || t('api.explore.defaultTitle')),
          location: String(item.location || ''),
          meta: String(item.meta || ''),
          key: `${String(item.location || 'location')}-${String(item.title || 'title')}-${index}`,
        }))
    : [];
  const baseData = locationRows.length ? locationRows : exploreSampleCards.map((item, index) => ({ ...item, key: `sample-${index}` }));
  const data = !normalizedSelected
    ? baseData.map((item) => ({ ...item, matchesSelected: false }))
    : [
        ...baseData
          .filter((item) => `${item.title} ${item.location} ${item.meta}`.toLowerCase().includes(normalizedSelected))
          .map((item) => ({ ...item, matchesSelected: true })),
        ...baseData
          .filter((item) => !(`${item.title} ${item.location} ${item.meta}`.toLowerCase().includes(normalizedSelected)))
          .map((item) => ({ ...item, matchesSelected: false })),
      ];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.location')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.location.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          {selectedLocation ? (
            <View className="mb-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
              <Text className="text-xs font-semibold text-brand-700">
                {t('pages.location.selectedRegion', { location: selectedLocation, defaultValue: `선택 지역: ${selectedLocation}` })}
              </Text>
            </View>
          ) : null}

          <View className="mb-4 rounded-3xl border border-gray-200 bg-gray-950 p-5">
            <Text className="text-sm font-semibold text-blue-200">{t('pages.location.mapTitle')}</Text>
            <View className="mt-3 h-40 rounded-3xl bg-gray-900 items-center justify-center">
              <MapPin size={34} color="#ffffff" />
              <Text className="mt-2 text-xs text-gray-300">{t('pages.location.mapPlaceholder')}</Text>
            </View>
          </View>

          {data.map((item) => (
            <TouchableOpacity key={item.key} className={`mb-3 rounded-3xl border bg-white p-4 ${item.matchesSelected ? 'border-brand-300' : 'border-gray-200'}`}>
              <View className="h-28 rounded-2xl bg-gray-100 items-center justify-center mb-3">
                <Waves size={28} color="#111827" />
              </View>
              <Text className="text-base font-semibold text-gray-950">{item.title}</Text>
              <Text className="mt-1 text-sm text-gray-500">{item.meta}</Text>
              <Text className="mt-2 text-sm text-gray-600">📍 {item.location}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
