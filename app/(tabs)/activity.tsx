import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Clock3, Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { activitySamples } from '../../src/mock/menuSamples';

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
          {activitySamples.map((row) => {
            const Icon = row.type === 'like' ? Heart : row.type === 'comment' ? MessageCircle : UserPlus;
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
                      <Text className="ml-1 text-xs text-gray-500">{row.when}</Text>
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
