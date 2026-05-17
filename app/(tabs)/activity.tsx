import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Clock3, Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

const rows = [
  { id: '1', icon: Heart, text: 'Your Jeju post received 12 likes.' },
  { id: '2', icon: MessageCircle, text: '3 new comments on your reel.' },
  { id: '3', icon: UserPlus, text: '2 divers started following you.' },
];

export default function ActivityScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.activity')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.activity.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <View key={row.id} className="mb-3 rounded-3xl border border-gray-200 bg-white p-4">
                <View className="flex-row items-center">
                  <View className="h-11 w-11 rounded-2xl bg-gray-100 items-center justify-center">
                    <Icon size={18} color="#111827" />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm text-gray-700">{row.text}</Text>
                    <View className="mt-1 flex-row items-center">
                      <Clock3 size={13} color="#9ca3af" />
                      <Text className="ml-1 text-xs text-gray-500">2h ago</Text>
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
