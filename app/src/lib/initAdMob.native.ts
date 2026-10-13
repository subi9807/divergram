import * as Device from 'expo-device';
import { isAdMobEnabled } from '../config/ads';

let initializationPromise: Promise<boolean> | null = null;

export function initializeAdMob(): Promise<boolean> {
  if (!isAdMobEnabled()) return Promise.resolve(false);
  if (initializationPromise) return initializationPromise;

  initializationPromise = initializeAdMobSdk();
  return initializationPromise;
}

export async function showAdPrivacyOptions(): Promise<boolean> {
  if (!isAdMobEnabled()) return false;
  try {
    const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } = await import('react-native-google-mobile-ads');
    await AdsConsent.requestInfoUpdate({ tagForUnderAgeOfConsent: false });
    const consentInfo = await AdsConsent.getConsentInfo();
    if (consentInfo.privacyOptionsRequirementStatus !== AdsConsentPrivacyOptionsRequirementStatus.REQUIRED) return false;
    await AdsConsent.showPrivacyOptionsForm();
    return true;
  } catch (error) {
    console.warn('[AdMob] Privacy options failed', error);
    return false;
  }
}

async function initializeAdMobSdk() {
  const shouldUseTestAds = __DEV__ || !Device.isDevice || process.env.EXPO_PUBLIC_ADMOB_FORCE_TEST_ADS === 'true';
  try {
    const { AdsConsent, default: mobileAdsModule } = await import('react-native-google-mobile-ads');

    try {
      await AdsConsent.gatherConsent({
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: shouldUseTestAds ? ['EMULATOR'] : [],
      });
    } catch (error) {
      // UMP can reuse the previous session's consent state when a refresh fails.
      console.warn('[AdMob] Consent refresh failed', error);
    }

    try {
      const consentInfo = await AdsConsent.getConsentInfo();
      if (!consentInfo.canRequestAds) return false;
    } catch (error) {
      // Do not suppress ads solely because the consent status lookup is unavailable.
      console.warn('[AdMob] Consent status lookup failed', error);
    }

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
