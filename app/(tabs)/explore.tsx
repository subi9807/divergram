import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Filter, MapPin, Search, Users, Waves } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { apiClient } from '../../src/lib/api';
import { exploreSampleCards } from '../../src/mock/menuSamples';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const topics = [
    t('common.all'),
    t('explore.topics.jeju'),
    t('explore.topics.freediving'),
    t('explore.topics.scuba'),
    t('explore.topics.night'),
    t('explore.topics.beginner'),
    t('explore.topics.photo'),
  ];
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const { data: exploreData = [] } = useQuery({ queryKey: ['explore'], queryFn: apiClient.getExplore });
  const data = exploreData.length ? exploreData : exploreSampleCards;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 pb-4 pt-4">
          <Text className="text-2xl font-bold text-surface-900">{t('explore.title')}</Text>
          <Text className="mt-1 text-surface-500">{t('explore.subtitle')}</Text>
          <View className="mt-4 h-12 flex-row items-center rounded-2xl border border-surface-200 bg-white px-4">
            <Search size={19} color="#64748b" />
            <TextInput className="ml-2 flex-1 text-surface-900" placeholder={t('explore.searchPlaceholder')} placeholderTextColor="#94a3b8" />
            <Filter size={19} color="#1e293b" />
          </View>
        </View>

        <View className="px-5 pb-4">
          <View className="rounded-3xl border border-surface-200 bg-white p-5 shadow-sm shadow-surface-200">
            <Text className="text-sm font-semibold text-brand-700">{t('brand.tagline')}</Text>
            <Text className="mt-2 text-2xl font-bold text-surface-900">{t('tabs.explore')}</Text>
            <View className="mt-4 flex-row">
              <View className="mr-2 flex-1 rounded-2xl bg-surface-50 px-3 py-2">
                <Text className="text-xs text-surface-500">{t('tabs.explore')}</Text>
                <Text className="mt-1 text-base font-bold text-surface-900">{data.length}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-surface-50 px-3 py-2">
                <Text className="text-xs text-surface-500">{t('common.all')}</Text>
                <Text className="mt-1 text-base font-bold text-surface-900">{topics.length - 1}</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 py-5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {topics.map((topic, index) => (
              <TouchableOpacity
                key={topic}
                activeOpacity={0.86}
                onPress={() => setActiveTopicIndex(index)}
                className={`mr-2 rounded-full px-4 py-2 ${activeTopicIndex === index ? 'bg-brand-600' : 'border border-surface-200 bg-white'}`}
              >
                <Text className={`font-semibold ${activeTopicIndex === index ? 'text-white' : 'text-surface-700'}`}>{topic}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="px-5">
          <Text className="mb-3 text-sm font-semibold text-surface-500">{t('tabs.feed')}</Text>
          {data.map((card, index) => (
            <TouchableOpacity key={`${card.title}-${index}`} activeOpacity={0.9} className="mb-4 rounded-3xl border border-surface-200 bg-white p-4 shadow-sm shadow-surface-200">
              <View className="mb-4 h-40 items-center justify-center rounded-3xl bg-brand-50">
                <Waves size={36} color="#0d5fa8" />
              </View>
              <Text className="text-lg font-semibold text-surface-900">{card.title}</Text>
              <View className="mt-2 flex-row items-center">
                <MapPin size={16} color="#64748b" />
                <Text className="ml-1 text-surface-600">{card.location}</Text>
              </View>
              <View className="mt-2 flex-row items-center">
                <Users size={16} color="#64748b" />
                <Text className="ml-1 text-surface-500">{card.meta}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
