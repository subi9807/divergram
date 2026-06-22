import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Clock3, Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { apiClient } from '../../src/lib/api';

export default function ActivityScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: rows = [] } = useQuery({
    queryKey: ['activity', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getNotifications(String(user?.id || '')),
  });
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950 dark:text-surface-50">{t('tabs.activity')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.activity.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          {rows.length === 0 ? (
            <View className="items-center rounded-3xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-8">
              <Clock3 size={28} color="#0d5fa8" />
              <Text className="mt-3 text-sm text-gray-500 dark:text-surface-400">{t('common.noData', { defaultValue: '최근 활동이 없습니다.' })}</Text>
            </View>
          ) : null}
          {rows.map((row) => {
            const Icon = row.type === 'like' ? Heart : row.type === 'comment' ? MessageCircle : UserPlus;
            return (
              <View key={row.id} className="mb-3 rounded-3xl border border-gray-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-4">
                <View className="flex-row items-center">
                  <View className="h-11 w-11 rounded-2xl bg-gray-100 dark:bg-surface-800 items-center justify-center">
                    <Icon size={18} color="#111827" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm text-gray-700 dark:text-surface-200">{row.text}</Text>
                    <View className="mt-1 flex-row items-center">
                      <Clock3 size={13} color="#9ca3af" />
                      <Text className="ml-1 text-xs text-gray-500 dark:text-surface-400">{row.when}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
