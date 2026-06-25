import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react-native';

type FeedAdSlotProps = {
  label?: string;
  subtitle?: string;
};

export function FeedAdSlot({ label, subtitle }: FeedAdSlotProps) {
  const { t } = useTranslation();

  return (
    <View className="mx-4 mb-5 overflow-hidden rounded-[28px] border border-brand-200/70 bg-gradient-to-br from-brand-50 via-white to-sky-50 dark:border-brand-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <View className="px-4 py-4">
        <View className="mb-3 flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-brand-600">
            <Megaphone size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-200">
              {t('feed.ad.slotLabel', { defaultValue: '광고 슬롯' })}
            </Text>
            <Text className="mt-1 text-base font-bold text-surface-900 dark:text-surface-50">
              {label || t('feed.ad.defaultTitle', { defaultValue: 'Divergram 추천 광고' })}
            </Text>
          </View>
        </View>
        <Text className="text-sm leading-5 text-surface-600 dark:text-surface-300">
          {subtitle || t('feed.ad.defaultSubtitle', { defaultValue: '웹에서는 광고 SDK를 초기화하지 않고 안내 카드만 보여줍니다.' })}
        </Text>
        <View className="mt-4 rounded-3xl border border-dashed border-brand-200/80 bg-white/80 px-3 py-3 dark:border-brand-900/40 dark:bg-slate-950/40">
          <Text className="text-center text-xs font-medium text-surface-500 dark:text-surface-400">
            {t('feed.ad.placeholder', { defaultValue: '모바일 앱에서 실제 광고가 표시됩니다.' })}
          </Text>
        </View>
      </View>
    </View>
  );
}

