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
      <Card className="mb-6 p-6">
        <View className="flex-row justify-between">
          {[1, 2, 3].map((i) => (
            <View key={i} className="items-center">
              <View className="mb-2 h-6 w-12 rounded bg-surface-200" />
              <View className="h-4 w-16 rounded bg-surface-200" />
            </View>
          ))}
        </View>
      </Card>
    );
  }

  const items = [
    { value: `${profile?.totalDives || 0}`, label: t('profile.stats.totalDives') },
    { value: profile?.maxDepth ? formatDepth(profile.maxDepth) : '0m', label: t('profile.stats.maxDepth') },
    { value: `${profile?.totalTime || 0}h`, label: t('profile.stats.totalTime') },
  ];

  return (
    <Card className="mb-6 p-6">
      <View className="flex-row items-center justify-between">
        {items.map((item, index) => (
          <View key={item.label} className="flex-1 items-center">
            <Text className="text-2xl font-bold text-brand-600">{item.value}</Text>
            <Text className="mt-1 text-sm text-surface-600">{item.label}</Text>
            {index < items.length - 1 ? <View className="absolute -right-1 top-1/2 h-9 w-px -translate-y-1/2 bg-surface-200" /> : null}
          </View>
        ))}
      </View>
    </Card>
  );
}
