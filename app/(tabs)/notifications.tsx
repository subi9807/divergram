import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Bell, CheckCircle2, Heart, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

const seed = [
  { id: '1', type: 'like', text: '@diver_jeju liked your post', unread: true },
  { id: '2', type: 'follow', text: '@nightblue started following you', unread: true },
  { id: '3', type: 'system', text: 'Resort update: Cebu promo published', unread: false },
];

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const [rows, setRows] = useState(seed);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-semibold text-gray-950">{t('tabs.notifications')}</Text>
              <Text className="mt-1 text-gray-500">{t('pages.notifications.subtitle')}</Text>
            </View>
            <TouchableOpacity className="rounded-full bg-gray-100 px-4 py-2" onPress={() => setRows((prev) => prev.map((r) => ({ ...r, unread: false })))}>
              <Text className="text-xs font-semibold text-gray-700">{t('pages.notifications.markAll')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-5 py-5">
          {rows.map((row) => {
            const Icon = row.type === 'like' ? Heart : row.type === 'follow' ? UserPlus : Bell;
            return (
              <View key={row.id} className="mb-3 rounded-3xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-center">
                  <View className="h-11 w-11 rounded-2xl bg-gray-100 items-center justify-center">
                    <Icon size={18} color="#111827" />
                  </View>
                  <Text className="ml-3 flex-1 text-sm text-gray-700">{row.text}</Text>
                  {row.unread ? <View className="h-2.5 w-2.5 rounded-full bg-blue-500" /> : <CheckCircle2 size={16} color="#9ca3af" />}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
