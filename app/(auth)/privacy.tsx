import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen>
      <ScrollView className="px-6 py-8">
        <View className="mb-5 flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/settings' as never);
            }}
            className="mr-3 h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-white"
          >
            <ChevronLeft size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-surface-700">{t('common.back', { defaultValue: '뒤로가기' })}</Text>
        </View>
        <Text className="text-2xl font-bold text-secondary-800 mb-6">
          {t('auth.privacy')}
        </Text>
        <Text className="text-secondary-600 leading-6 mb-4">
          {t('privacy.content1')}
        </Text>
        <Text className="text-secondary-600 leading-6 mb-4">
          {t('privacy.content2')}
        </Text>
        <Text className="text-secondary-600 leading-6">
          {t('privacy.content3')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
