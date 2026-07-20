import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, Search } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { appRouteMap } from '../../config/sitemap';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

export function FeedHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isDark } = useResolvedTheme();
  const iconColor = isDark ? '#e2e8f0' : '#1e293b';

  return (
    <View className="px-5 pb-3 pt-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-surface-900 dark:text-surface-50">{t('tabs.feed')}</Text>
          <Text className="mt-1 text-surface-500 dark:text-surface-400">{t('feed.header.subtitle')}</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-sm shadow-surface-200 dark:shadow-transparent"
            activeOpacity={0.86}
            onPress={() => router.push(appRouteMap.search.path as never)}
          >
            <Search size={19} color={iconColor} />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-sm shadow-surface-200 dark:shadow-transparent"
            activeOpacity={0.86}
            onPress={() => router.push(appRouteMap.notifications.path as never)}
          >
            <Bell size={19} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <View className="mt-4 rounded-3xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4 shadow-sm shadow-surface-200 dark:shadow-transparent">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold text-brand-700">{t('brand.tagline')}</Text>
            <Text className="mt-1 text-xl font-bold text-surface-900 dark:text-surface-50">{t('feed.header.tabs.forYou')}</Text>
          </View>
          <View className="rounded-2xl bg-brand-50 px-3 py-2">
            <ExpoImage
              source={require('../../../assets/images/divergram-logo-blue.png')}
              style={{ width: 26, height: 26 }}
              contentFit="cover"
              transition={120}
            />
          </View>
        </View>
        <View className="mt-3 h-px bg-surface-100 dark:bg-surface-800" />
        <View className="mt-3 flex-row">
          <View className="mr-2 flex-1 rounded-2xl bg-surface-50 dark:bg-surface-800 px-3 py-2">
            <Text className="text-xs text-surface-500 dark:text-surface-400">{t('feed.header.tabs.following')}</Text>
            <Text className="mt-1 text-base font-bold text-surface-900 dark:text-surface-50">{t('common.today')}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-surface-50 dark:bg-surface-800 px-3 py-2">
            <Text className="text-xs text-surface-500 dark:text-surface-400">{t('feed.header.tabs.nearby')}</Text>
            <Text className="mt-1 text-base font-bold text-surface-900 dark:text-surface-50">{t('tabs.explore')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
