import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, PlusCircle, Search } from 'lucide-react-native';
import { appRouteMap } from '../../config/sitemap';

export function FeedHeader() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="px-5 pb-3 pt-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-surface-900">
            {t('tabs.feed')}
          </Text>
          <Text className="mt-1 text-surface-500">
            {t('feed.header.subtitle')}
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full border border-surface-200 bg-white"
            activeOpacity={0.86}
            onPress={() => router.push(appRouteMap.search.path as never)}
          >
            <Search size={19} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full border border-surface-200 bg-white"
            activeOpacity={0.86}
            onPress={() => router.push(appRouteMap.notifications.path as never)}
          >
            <Bell size={19} color="#1e293b" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-brand-500"
            activeOpacity={0.86}
            onPress={() => router.push(appRouteMap.create.path as never)}
          >
            <PlusCircle size={19} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="mt-4 flex-row">
        {[t('feed.header.tabs.following'), t('feed.header.tabs.forYou'), t('feed.header.tabs.nearby')].map((item, index) => (
          <TouchableOpacity
            key={item}
            activeOpacity={0.86}
            className={`mr-2 rounded-full px-4 py-2 ${index === 1 ? 'bg-brand-600' : 'border border-surface-200 bg-white'}`}
          >
            <Text className={`text-sm font-semibold ${index === 1 ? 'text-white' : 'text-surface-700'}`}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
