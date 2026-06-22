import Constants from 'expo-constants';

type FeatureFlags = {
  kakaoLoginEnabled?: boolean;
};

function readFeatureFlags(): FeatureFlags {
  const extra = (Constants.expoConfig?.extra ?? {}) as { featureFlags?: FeatureFlags };
  return extra.featureFlags ?? {};
}

export const KAKAO_LOGIN_ENABLED = readFeatureFlags().kakaoLoginEnabled ?? false;
