import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as Device from 'expo-device';
import { useTranslation } from 'react-i18next';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { getAdMobBannerUnitId } from '../../config/ads';

type FeedAdSlotProps = {
  label?: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export function FeedAdSlot(_props: FeedAdSlotProps) {
  const { t } = useTranslation();
  const [bannerFailed, setBannerFailed] = useState(false);
  const bannerUnitId = getAdMobBannerUnitId();
  const shouldUseTestAds = __DEV__ || !Device.isDevice || process.env.EXPO_PUBLIC_ADMOB_FORCE_TEST_ADS === 'true';
  const bannerReady = useMemo(() => {
    if (bannerFailed) return false;
    if (bannerUnitId) return true;
    return shouldUseTestAds;
  }, [bannerFailed, bannerUnitId, shouldUseTestAds]);
  const resolvedUnitId = shouldUseTestAds ? TestIds.BANNER : bannerUnitId;

  return (
    <View className="mx-4 mb-5 items-center overflow-hidden rounded-2xl bg-transparent">
      {bannerReady ? (
        <BannerAd
          unitId={resolvedUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={() => setBannerFailed(true)}
        />
      ) : (
        <View className="h-[50px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {t('feed.ad.placeholder', { defaultValue: '광고를 불러오는 중입니다.' })}
          </Text>
        </View>
      )}
    </View>
  );
}
