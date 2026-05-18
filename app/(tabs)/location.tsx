import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Waves } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { exploreSampleCards } from '../../src/mock/menuSamples';

export default function LocationScreen() {
  const { t } = useTranslation();
  const { data: locationFeed = [] } = useQuery({ queryKey: ['location-feed'], queryFn: apiClient.getExplore });
  const data = locationFeed.length ? locationFeed : exploreSampleCards;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.location')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.location.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <View className="mb-4 rounded-3xl border border-gray-200 bg-gray-950 p-5">
            <Text className="text-sm font-semibold text-blue-200">{t('pages.location.mapTitle')}</Text>
            <View className="mt-3 h-40 rounded-3xl bg-gray-900 items-center justify-center">
              <MapPin size={34} color="#ffffff" />
              <Text className="mt-2 text-xs text-gray-300">{t('pages.location.mapPlaceholder')}</Text>
            </View>
          </View>

          {data.map((item) => (
            <TouchableOpacity key={item.title} className="mb-3 rounded-3xl border border-gray-200 bg-white p-4">
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
