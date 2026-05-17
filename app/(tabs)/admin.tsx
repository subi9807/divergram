import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Shield } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';

export default function AdminScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-5 py-4 border-b border-gray-100">
          <Text className="text-2xl font-semibold text-gray-950">{t('tabs.admin')}</Text>
          <Text className="mt-1 text-gray-500">{t('pages.admin.subtitle')}</Text>
        </View>

        <View className="px-5 py-5">
          <View className="rounded-3xl border border-gray-200 bg-white p-6 items-center">
            <View className="h-14 w-14 rounded-2xl bg-gray-100 items-center justify-center">
              <Shield size={24} color="#111827" />
            </View>
            <Text className="mt-4 text-base font-semibold text-gray-900">{t('pages.admin.restricted')}</Text>
            <Text className="mt-2 text-center text-sm text-gray-500">{t('pages.admin.note')}</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
