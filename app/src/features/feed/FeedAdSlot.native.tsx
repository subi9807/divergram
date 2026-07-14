import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as Device from 'expo-device';
import { useTranslation } from 'react-i18next';
import {
  NativeAd,
  NativeAdChoicesPlacement,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaAspectRatio,
  NativeMediaView,
  TestIds,
} from 'react-native-google-mobile-ads';
import { getAdMobNativeUnitId } from '../../config/ads';
import { initializeAdMob } from '../../lib/initAdMob';

const MAX_LOAD_ATTEMPTS = 2;
let adRequestQueue: Promise<void> = Promise.resolve();

function enqueueAdRequest<T>(request: () => Promise<T>): Promise<T> {
  const queuedRequest = adRequestQueue
    .catch(() => undefined)
    .then(() => request());
  adRequestQueue = queuedRequest.then(
    () => undefined,
    () => undefined,
  );
  return queuedRequest;
}

type FeedAdSlotProps = {
  label?: string;
  subtitle?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export function FeedAdSlot(_props: FeedAdSlotProps) {
  const { t } = useTranslation();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [adFailed, setAdFailed] = useState(false);
  const nativeAdUnitId = getAdMobNativeUnitId();
  const shouldUseTestAds = __DEV__ || !Device.isDevice || process.env.EXPO_PUBLIC_ADMOB_FORCE_TEST_ADS === 'true';
  const resolvedUnitId = shouldUseTestAds ? TestIds.NATIVE : nativeAdUnitId;

  useEffect(() => {
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setNativeAd(null);
    setAdFailed(false);

    if (!resolvedUnitId) {
      setAdFailed(true);
      return () => {
        mounted = false;
      };
    }

    const loadAd = async (attempt: number) => {
      const initialized = await initializeAdMob();
      if (!mounted) return;
      if (!initialized) {
        setAdFailed(true);
        return;
      }

      try {
        const ad = await enqueueAdRequest(() =>
          NativeAd.createForAdRequest(resolvedUnitId, {
            adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
            aspectRatio: NativeMediaAspectRatio.LANDSCAPE,
            requestNonPersonalizedAdsOnly: true,
            startVideoMuted: true,
          }),
        );
        if (!mounted) {
          ad.destroy();
          return;
        }
        setNativeAd(ad);
      } catch (error) {
        console.warn(`[AdMob] Native ad load failed (${attempt}/${MAX_LOAD_ATTEMPTS})`, error);
        if (!mounted) return;
        if (attempt < MAX_LOAD_ATTEMPTS) {
          retryTimer = setTimeout(() => void loadAd(attempt + 1), attempt * 10000);
        } else {
          setAdFailed(true);
        }
      }
    };

    void loadAd(1);

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [resolvedUnitId]);

  useEffect(() => {
    if (!nativeAd) return undefined;
    return () => {
      nativeAd.destroy();
    };
  }, [nativeAd]);

  return (
    <View style={styles.container}>
      {nativeAd ? (
        <NativeAdView nativeAd={nativeAd} style={styles.card}>
          <View style={styles.header}>
            {nativeAd.icon ? (
              <NativeAsset assetType={NativeAssetType.ICON}>
                <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
              </NativeAsset>
            ) : (
              <View style={styles.iconPlaceholder} />
            )}
            <View style={styles.titleGroup}>
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text style={styles.headline} numberOfLines={1}>
                  {nativeAd.headline}
                </Text>
              </NativeAsset>
              {nativeAd.advertiser ? (
                <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                  <Text style={styles.advertiser} numberOfLines={1}>
                    {nativeAd.advertiser}
                  </Text>
                </NativeAsset>
              ) : (
                <Text style={styles.advertiser}>{t('feed.ad.sponsored', { defaultValue: 'Sponsored' })}</Text>
              )}
            </View>
            <Text style={styles.badge}>{t('feed.ad.badge', { defaultValue: '광고' })}</Text>
          </View>

          <NativeMediaView resizeMode="cover" style={styles.media} />

          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.body} numberOfLines={2}>
                {nativeAd.body}
              </Text>
            </NativeAsset>
          ) : null}

          {nativeAd.callToAction ? (
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <Text style={styles.cta}>
                {nativeAd.callToAction}
              </Text>
            </NativeAsset>
          ) : null}
        </NativeAdView>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            {adFailed
              ? t('feed.ad.unavailable', { defaultValue: '광고를 불러오지 못했습니다.' })
              : t('feed.ad.placeholder', { defaultValue: '광고를 불러오는 중입니다.' })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  iconPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  advertiser: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#facc15',
    color: '#422006',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  media: {
    width: '100%',
    minHeight: 180,
    backgroundColor: '#e2e8f0',
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 14,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  placeholder: {
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
});
