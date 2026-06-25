import { Platform } from 'react-native';
import Constants from 'expo-constants';

type AdMobExtra = {
  androidAppId?: string;
  iosAppId?: string;
  androidBannerUnitId?: string;
  iosBannerUnitId?: string;
  enabled?: boolean;
};

function getAdMobExtra(): AdMobExtra {
  const extra = (Constants.expoConfig?.extra ?? {}) as { adMob?: AdMobExtra };
  return extra.adMob ?? {};
}

export function getAdMobAppId() {
  const extra = getAdMobExtra();
  return Platform.OS === 'android' ? extra.androidAppId || '' : extra.iosAppId || '';
}

export function getAdMobBannerUnitId() {
  const extra = getAdMobExtra();
  return Platform.OS === 'android' ? extra.androidBannerUnitId || '' : extra.iosBannerUnitId || '';
}

export function isAdMobEnabled() {
  const extra = getAdMobExtra();
  return Boolean(extra.enabled || getAdMobAppId());
}

