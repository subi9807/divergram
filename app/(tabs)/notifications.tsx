import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, CheckCircle2, Heart, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { PermissionGate } from '../../src/components/PermissionGate';
import { notificationSamples } from '../../src/mock/menuSamples';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const [rows, setRows] = useState(notificationSamples);
  const unread = useMemo(() => rows.filter((row) => row.unread).length, [rows]);

  return (
    <Screen>
      <PermissionGate
        permission="notifications"
        title={t('permissions.notifications.title')}
        description={t('permissions.notifications.description')}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          <View className="px-5 pb-4 pt-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-surface-900">{t('tabs.notifications')}</Text>
                <Text className="mt-1 text-surface-500">{t('pages.notifications.subtitle')}</Text>
              </View>
              <TouchableOpacity className="rounded-full bg-brand-600 px-4 py-2" onPress={() => setRows((prev) => prev.map((r) => ({ ...r, unread: false })))}>
                <Text className="text-xs font-semibold text-white">{t('pages.notifications.markAll')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="px-5 pb-4">
            <LinearGradient colors={['#0d5fa8', '#1198f5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-3xl p-5">
              <Text className="text-sm font-semibold text-blue-100">{t('brand.tagline')}</Text>
              <Text className="mt-2 text-2xl font-bold text-white">{unread}</Text>
              <Text className="text-blue-100">{t('pages.notifications.markAll')}</Text>
            </LinearGradient>
          </View>

          <View className="px-5 py-5">
            {rows.map((row) => {
              const Icon = row.type === 'like' ? Heart : row.type === 'follow' ? UserPlus : Bell;
              return (
                <View key={row.id} className={`mb-3 rounded-3xl border bg-white p-4 shadow-sm shadow-surface-200 ${row.unread ? 'border-brand-200' : 'border-surface-200'}`}>
                  <View className="flex-row items-center">
                    <View className={`h-11 w-11 items-center justify-center rounded-2xl ${row.unread ? 'bg-brand-50' : 'bg-surface-100'}`}>
                      <Icon size={18} color={row.unread ? '#0d5fa8' : '#334155'} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-sm text-surface-700">{row.text}</Text>
                      <Text className="mt-1 text-xs text-surface-400">{row.when}</Text>
                    </View>
                    {row.unread ? <View className="h-2.5 w-2.5 rounded-full bg-brand-500" /> : <CheckCircle2 size={16} color="#9ca3af" />}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </PermissionGate>
    </Screen>
  );
}
