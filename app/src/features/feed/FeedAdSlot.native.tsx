import React, { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { getAdMobBannerUnitId } from '../../config/ads';

type FeedAdSlotProps = {
  label?: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export function FeedAdSlot({
  label,
  subtitle,
  ctaLabel,
  onPress,
}: FeedAdSlotProps) {
  const { t } = useTranslation();
  const [bannerFailed, setBannerFailed] = useState(false);
  const bannerUnitId = getAdMobBannerUnitId();
  const bannerReady = useMemo(() => {
    if (bannerFailed) return false;
    if (bannerUnitId) return true;
    return __DEV__;
  }, [bannerFailed, bannerUnitId]);
  const resolvedUnitId = bannerUnitId || (__DEV__ ? TestIds.BANNER : '');

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
          {subtitle || t('feed.ad.defaultSubtitle', { defaultValue: '피드 3번째 카드 이후에 자연스럽게 노출되는 운영용 광고 슬롯입니다.' })}
        </Text>

        <View className="mt-4 overflow-hidden rounded-3xl border border-dashed border-brand-200/80 bg-white/80 px-3 py-3 dark:border-brand-900/40 dark:bg-slate-950/40">
          {bannerReady ? (
            <BannerAd
              unitId={resolvedUnitId}
              size={BannerAdSize.BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
              onAdFailedToLoad={() => setBannerFailed(true)}
            />
          ) : (
            <View className="min-h-[50px] items-center justify-center">
              <Text className="text-xs font-medium text-surface-500 dark:text-surface-400">
                {t('feed.ad.placeholder', { defaultValue: '광고 ID가 연결되면 이 영역에 실제 Google AdMob 배너가 표시됩니다.' })}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-xs font-medium text-surface-500 dark:text-surface-400">
            {t('feed.ad.googleReady', { defaultValue: 'Google AdMob 연동 가능 위치' })}
          </Text>
          {onPress ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={onPress}
              className="rounded-full bg-brand-600 px-4 py-2"
            >
              <Text className="text-xs font-semibold text-white">
                {ctaLabel || t('feed.ad.cta', { defaultValue: '자세히 보기' })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

