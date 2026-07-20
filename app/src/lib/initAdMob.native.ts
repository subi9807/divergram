import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { isAdMobEnabled } from '../config/ads';

let initializationPromise: Promise<boolean> | null = null;

export function initializeAdMob(): Promise<boolean> {
  if (!isAdMobEnabled()) return Promise.resolve(false);
  if (initializationPromise) return initializationPromise;

  initializationPromise = initializeAdMobSdk();
  return initializationPromise;
}

async function initializeAdMobSdk() {
  const shouldUseTestAds = __DEV__ || !Device.isDevice || process.env.EXPO_PUBLIC_ADMOB_FORCE_TEST_ADS === 'true';
  try {
    const { default: mobileAdsModule } = await import('react-native-google-mobile-ads');
    const mobileAds = mobileAdsModule();
    await mobileAds.setRequestConfiguration({
      testDeviceIdentifiers: shouldUseTestAds ? ['EMULATOR'] : [],
    });
    await mobileAds.initialize();
    return true;
  } catch (error) {
    console.warn('[AdMob] SDK initialization failed', error);
    // 광고 초기화 실패는 앱 실행을 막지 않는다.
    initializationPromise = null;
    return false;
  }
}
