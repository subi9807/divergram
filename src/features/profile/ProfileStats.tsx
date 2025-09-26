import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../../components/Card';
import { useTranslation } from 'react-i18next';
import { formatDepth } from '../../lib/utils';

interface ProfileStatsProps {
  profile: {
    totalDives?: number;
    maxDepth?: number;
    totalTime?: number;
  } | null | undefined;
  loading: boolean;
}

export function ProfileStats({ profile, loading }: ProfileStatsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="p-6 mb-6">
        <View className="flex-row justify-between">
          {[1, 2, 3].map((i) => (
            <View key={i} className="items-center">
              <View className="w-12 h-6 bg-secondary-200 rounded mb-2" />
              <View className="w-16 h-4 bg-secondary-200 rounded" />
            </View>
          ))}
        </View>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6">
      <View className="flex-row justify-between">
        <View className="items-center">
          <Text className="text-2xl font-bold text-primary-600">
            {profile?.totalDives || 0}
          </Text>
          <Text className="text-secondary-600 text-sm mt-1">
            {t('profile.stats.totalDives')}
          </Text>
        </View>
        
        <View className="items-center">
          <Text className="text-2xl font-bold text-primary-600">
            {profile?.maxDepth ? formatDepth(profile.maxDepth) : '0m'}
          </Text>
          <Text className="text-secondary-600 text-sm mt-1">
            {t('profile.stats.maxDepth')}
          </Text>
        </View>
        
        <View className="items-center">
          <Text className="text-2xl font-bold text-primary-600">
            {profile?.totalTime || 0}h
          </Text>
          <Text className="text-secondary-600 text-sm mt-1">
            {t('profile.stats.totalTime')}
          </Text>
        </View>
      </View>
    </Card>
  );
}