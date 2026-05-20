import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../../components/Card';
import { useTranslation } from 'react-i18next';
import { formatCompactNumber, formatDepth } from '../../lib/utils';
import { Clock3, Gauge, Waves } from 'lucide-react-native';

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
    {
      value: formatCompactNumber(Number(profile?.totalDives || 0)),
      label: t('profile.stats.totalDives'),
      icon: Waves,
    },
    {
      value: profile?.maxDepth ? formatDepth(profile.maxDepth) : '0m',
      label: t('profile.stats.maxDepth'),
      icon: Gauge,
    },
    {
      value: `${formatCompactNumber(Number(profile?.totalTime || 0))}h`,
      label: t('profile.stats.totalTime'),
      icon: Clock3,
    },
  ];

  return (
    <Card className="mb-5 p-0">
      <View className="flex-row items-center justify-between">
        {items.map((item, index) => (
          <View key={item.label} className={`flex-1 items-center px-2 py-4 ${index < items.length - 1 ? 'border-r border-surface-200' : ''}`}>
            <View className="mb-2 h-8 w-8 items-center justify-center rounded-full bg-brand-50">
              <item.icon size={16} color="#0d5fa8" />
            </View>
            <Text className="text-[22px] font-bold text-surface-900">{item.value}</Text>
            <Text className="mt-1 text-xs text-surface-600">{item.label}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
