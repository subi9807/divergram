import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { feedCardStyle } from './feedCardStyle';

type FeedAdSlotProps = {
  label?: string;
  subtitle?: string;
};

export function FeedAdSlot({ subtitle }: FeedAdSlotProps) {
  const { t } = useTranslation();

  return (
    <View style={feedCardStyle} className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <View className="px-3 py-2">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {t('feed.ad.slotLabel', { defaultValue: '광고' })}
        </Text>
        <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {subtitle || t('feed.ad.defaultSubtitle', { defaultValue: '광고는 모바일 앱에서 노출됩니다.' })}
        </Text>
      </View>
    </View>
  );
}
