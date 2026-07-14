import { Platform } from 'react-native';
import Constants from 'expo-constants';

type AdMobExtra = {
  androidAppId?: string;
  iosAppId?: string;
  androidBannerUnitId?: string;
  iosBannerUnitId?: string;
  androidNativeUnitId?: string;
  iosNativeUnitId?: string;
  enabled?: boolean;
};

const ADMOB_IDS = {
  androidApp: 'ca-app-pub-6018533601998790~9736334888',
  iosApp: 'ca-app-pub-6018533601998790~5278215124',
  androidNative: 'ca-app-pub-6018533601998790/6886397577',
  iosNative: 'ca-app-pub-6018533601998790/8455042807',
} as const;

function getAdMobExtra(): AdMobExtra {
  const extra = (Constants.expoConfig?.extra ?? {}) as { adMob?: AdMobExtra };
  return extra.adMob ?? {};
}

export function getAdMobAppId() {
  const extra = getAdMobExtra();
  return Platform.OS === 'android'
    ? extra.androidAppId || ADMOB_IDS.androidApp
    : extra.iosAppId || ADMOB_IDS.iosApp;
}

export function getAdMobBannerUnitId() {
  const extra = getAdMobExtra();
  return Platform.OS === 'android' ? extra.androidBannerUnitId || '' : extra.iosBannerUnitId || '';
}

export function getAdMobNativeUnitId() {
  const extra = getAdMobExtra();
  if (Platform.OS === 'android') {
    return extra.androidNativeUnitId || extra.androidBannerUnitId || ADMOB_IDS.androidNative;
  }
  return extra.iosNativeUnitId || extra.iosBannerUnitId || ADMOB_IDS.iosNative;
}

export function isAdMobEnabled() {
  const extra = getAdMobExtra();
  return Boolean(extra.enabled || getAdMobAppId());
}
