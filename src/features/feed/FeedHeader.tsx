import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export function FeedHeader() {
  const { t } = useTranslation();

  return (
    <View className="px-6 py-4 bg-white border-b border-secondary-200">
      <Text className="text-2xl font-bold text-secondary-800">
        {t('tabs.feed')}
      </Text>
      <Text className="text-secondary-600 mt-1">
        Explore diving experiences from the community
      </Text>
    </View>
  );
}