import type { ExpoConfig, ConfigContext } from 'expo/config';

const GOOGLE_CLIENT_ID_IOS_FALLBACK =
  '80553477111-8v6n2mc564oiqfuairrues6imrq1267j.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID_FALLBACK =
  '80553477111-5nno7qm9m16alsdu0j9tkn143a14fes4.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB_FALLBACK =
  '80553477111-6d0ev7ntgc6ki5t5a3qn0v8q75b13a4v.apps.googleusercontent.com';

function getGoogleIosClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || process.env.GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID_IOS_FALLBACK;
}

function getGoogleWebClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID_WEB || GOOGLE_CLIENT_ID_WEB_FALLBACK;
}

function getGoogleMapsApiKey(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
}

function getAdMobAppId(platform: 'android' | 'ios'): string {
  const fallback =
    platform === 'android'
      ? 'ca-app-pub-6018533601998790~9736334888'
      : 'ca-app-pub-6018533601998790~5278215124';
  if (platform === 'android') {
    return process.env.EXPO_PUBLIC_GOOGLE_ADMOB_ANDROID_APP_ID || process.env.GOOGLE_ADMOB_ANDROID_APP_ID || fallback;
  }
  return process.env.EXPO_PUBLIC_GOOGLE_ADMOB_IOS_APP_ID || process.env.GOOGLE_ADMOB_IOS_APP_ID || fallback;
}

function getAdMobBannerUnitId(platform: 'android' | 'ios'): string {
  if (platform === 'android') {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_ADMOB_ANDROID_BANNER_UNIT_ID ||
      process.env.GOOGLE_ADMOB_ANDROID_BANNER_UNIT_ID ||
      'ca-app-pub-6018533601998790/6886397577'
    );
  }
  return process.env.EXPO_PUBLIC_GOOGLE_ADMOB_IOS_BANNER_UNIT_ID || process.env.GOOGLE_ADMOB_IOS_BANNER_UNIT_ID || 'ca-app-pub-6018533601998790/8455042807';
}

function getAdMobNativeUnitId(platform: 'android' | 'ios'): string {
  if (platform === 'android') {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_ADMOB_ANDROID_NATIVE_UNIT_ID ||
      process.env.GOOGLE_ADMOB_ANDROID_NATIVE_UNIT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_ADMOB_ANDROID_BANNER_UNIT_ID ||
      process.env.GOOGLE_ADMOB_ANDROID_BANNER_UNIT_ID ||
      'ca-app-pub-6018533601998790/6886397577'
    );
  }
  return (
    process.env.EXPO_PUBLIC_GOOGLE_ADMOB_IOS_NATIVE_UNIT_ID ||
    process.env.GOOGLE_ADMOB_IOS_NATIVE_UNIT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_ADMOB_IOS_BANNER_UNIT_ID ||
    process.env.GOOGLE_ADMOB_IOS_BANNER_UNIT_ID ||
    'ca-app-pub-6018533601998790/8455042807'
  );
}

function getPaypalDonationUrl(): string {
  return process.env.EXPO_PUBLIC_PAYPAL_DONATE_URL || process.env.PAYPAL_DONATE_URL || '';
}

function getPaypalClientId(): string {
  return (
    process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID ||
    process.env.PAYPAL_CLIENT_ID ||
    'BAAnnRigmVrw7Ackm5yYkRNTEofhNYC6HRrYlKNZj08Hk2fHQWLTYqIG3i3OjZjmmhk8zfzktmm4YZR1Ow'
  );
}

function getPaypalHostedButtonId(): string {
  return process.env.EXPO_PUBLIC_PAYPAL_HOSTED_BUTTON_ID || process.env.PAYPAL_HOSTED_BUTTON_ID || 'ZE8JLS99SK2EU';
}

function toGoogleIosUrlScheme(clientId: string): string | null {
  const trimmed = clientId.trim();
  if (!trimmed) return null;
  const suffix = '.apps.googleusercontent.com';
  if (!trimmed.endsWith(suffix)) return null;
  const id = trimmed.slice(0, -suffix.length);
  return id ? `com.googleusercontent.apps.${id}` : null;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleIosUrlScheme = toGoogleIosUrlScheme(getGoogleIosClientId());
  const googleMapsApiKey = getGoogleMapsApiKey();
  const adMobAndroidAppId = getAdMobAppId('android');
  const adMobIosAppId = getAdMobAppId('ios');
  const paypalDonationUrl = getPaypalDonationUrl();
  const paypalClientId = getPaypalClientId();
  const paypalHostedButtonId = getPaypalHostedButtonId();
  const isProductionBuild = process.env.EAS_BUILD_PROFILE === 'production';
  const sentryOrg = String(process.env.SENTRY_ORG || '').trim();
  const sentryProject = String(process.env.SENTRY_PROJECT || '').trim();
  const expoDevClientPlugin = isProductionBuild
    ? []
    : [
        [
          'expo-dev-client',
          {
            launchMode: 'most-recent',
            defaultLaunchURL: 'http://localhost:8081',
            android: {
              defaultLaunchURL: 'http://10.0.2.2:8081'
            },
            skipOnboarding: true,
            showMenuAtLaunch: false
          }
        ]
      ];

  return {
    ...config,
    name: 'Divergram',
    slug: 'divergram',
    version: '1.2.12',
    orientation: 'default',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: 'divergram',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.divergram.app.ios',
      buildNumber: config.ios?.buildNumber || '68',
      associatedDomains: ['applinks:divergram.com', 'applinks:www.divergram.com'],
      googleServicesFile: './GoogleService-Info.plist',
      usesAppleSignIn: true,
      entitlements: {
        'aps-environment': isProductionBuild ? 'production' : 'development'
      },
      infoPlist: {
        GIDClientID: getGoogleIosClientId(),
        GIDServerClientID: getGoogleWebClientId(),
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: '위치 정보는 다이빙 로그 기록에 사용됩니다.',
        NSLocationAlwaysAndWhenInUseUsageDescription: '백그라운드에서 다이빙 경로 추적을 위해 위치 권한이 필요합니다.',
        NSCameraUsageDescription: '프로필, 게시물, 다이빙 로그에 사용할 사진과 영상을 촬영하기 위해 카메라 권한이 필요합니다.',
        NSMicrophoneUsageDescription: '다이빙 로그 음성 메모를 녹음하고 사용자가 요청한 경우 텍스트로 변환하기 위해 마이크 권한이 필요합니다.',
        NSMotionUsageDescription: '다이빙 활동 기록과 안전 기능에 필요한 움직임 정보를 확인하기 위해 모션 권한이 필요합니다.',
        NSPhotoLibraryUsageDescription: '사진 GPS 정보를 읽어 다이빙 포인트를 자동으로 설정합니다.',
        NSPhotoLibraryAddUsageDescription: '다이빙 로그 저장을 위해 사진 접근이 필요합니다.',
        NSBluetoothAlwaysUsageDescription: '다이빙 장비와의 연결을 위해 블루투스 권한이 필요합니다.',
        NSBluetoothPeripheralUsageDescription: '다이빙 디바이스와의 데이터 교환을 위해 블루투스 권한이 필요합니다.',
        UIBackgroundModes: ['fetch', 'remote-notification'],
        CFBundleURLTypes: [
          {
            CFBundleURLName: 'divergram-app',
            CFBundleURLSchemes: ['divergram']
          },
          ...(googleIosUrlScheme
            ? [
                {
                  CFBundleURLName: 'google-signin',
                  CFBundleURLSchemes: [googleIosUrlScheme]
                }
              ]
            : [])
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0EA5E9'
      },
      package: 'com.divergram.app',
      googleServicesFile: './google-services.json',
      versionCode: 67,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: ['divergram.com', 'www.divergram.com'].flatMap((host) =>
            ['/post', '/reel', '/profile', '/resort', '/guide', '/marine-life', '/notifications'].map((pathPrefix) => ({
              scheme: 'https',
              host,
              pathPrefix,
            }))
          ),
          category: ['BROWSABLE', 'DEFAULT']
        }
      ],
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'BLUETOOTH',
        'BLUETOOTH_ADMIN',
        'BLUETOOTH_SCAN',
        'BLUETOOTH_CONNECT',
        'BLUETOOTH_ADVERTISE',
        'POST_NOTIFICATIONS',
        'RECORD_AUDIO',
        'INTERNET',
        'ACCESS_NETWORK_STATE'
      ]
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
      name: 'Divergram',
      shortName: 'Divergram',
      description: '다이빙 커뮤니티 앱',
      themeColor: '#0EA5E9',
      backgroundColor: '#ffffff',
      display: 'standalone',
      startUrl: '/',
      lang: 'ko'
    },
    plugins: [
      ...expoDevClientPlugin,
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FFFFFF',
          image: './assets/images/splash.png',
          imageWidth: 380,
          resizeMode: 'cover',
          ios: {
            enableFullScreenImage_legacy: true,
            resizeMode: 'cover'
          }
        }
      ],
      'expo-router',
      'expo-font',
      'expo-asset',
      'expo-image',
      'expo-image-picker',
      'expo-localization',
      'expo-status-bar',
      'expo-web-browser',
      ['expo-audio', { microphonePermission: '다이빙 로그 음성 메모를 녹음하고 텍스트로 변환하기 위해 마이크 권한이 필요합니다.' }],
      'expo-sqlite',
      'expo-secure-store',
      'expo-iap',
      ...(sentryOrg && sentryProject
        ? [['@sentry/react-native/expo', { organization: sentryOrg, project: sentryProject }]]
        : []),
      'expo-apple-authentication',
      '@react-native-google-signin/google-signin',
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      ...(adMobAndroidAppId || adMobIosAppId
        ? [
            [
              'react-native-google-mobile-ads',
              {
                androidAppId: adMobAndroidAppId,
                iosAppId: adMobIosAppId,
                delay_app_measurement_init: true,
                user_tracking_usage_description: '맞춤형 광고와 앱 성능 개선을 위해 광고 식별자를 사용합니다.'
              }
            ]
          ]
        : []),
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: '35.0.0'
          },
          ios: {
            deploymentTarget: '16.4'
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      googleMapsApiKey,
      adMob: {
        androidAppId: adMobAndroidAppId,
        iosAppId: adMobIosAppId,
        androidBannerUnitId: getAdMobBannerUnitId('android'),
        iosBannerUnitId: getAdMobBannerUnitId('ios'),
        androidNativeUnitId: getAdMobNativeUnitId('android'),
        iosNativeUnitId: getAdMobNativeUnitId('ios'),
        enabled: Boolean(adMobAndroidAppId || adMobIosAppId)
      },
      paypal: {
        donateUrl: paypalDonationUrl,
        clientId: paypalClientId,
        hostedButtonId: paypalHostedButtonId
      },
      socialAuth: {
        googleClientIdIos:
          process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
          process.env.GOOGLE_CLIENT_ID_IOS ||
          GOOGLE_CLIENT_ID_IOS_FALLBACK,
        googleClientIdAndroid:
          process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
          process.env.GOOGLE_CLIENT_ID_ANDROID ||
          GOOGLE_CLIENT_ID_ANDROID_FALLBACK,
        googleClientIdWeb:
          process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
          process.env.GOOGLE_CLIENT_ID_WEB ||
          GOOGLE_CLIENT_ID_WEB_FALLBACK,
        kakaoRestApiKey: process.env.KAKAO_REST_API_KEY || '',
        kakaoRedirectUri: process.env.KAKAO_REDIRECT_URI || 'divergram://auth/kakao',
        naverClientId: process.env.NAVER_CLIENT_ID || '',
        naverClientSecret: process.env.NAVER_CLIENT_SECRET || '',
        naverRedirectUri: process.env.NAVER_REDIRECT_URI || 'divergram://auth/naver',
        instagramClientId: process.env.INSTAGRAM_CLIENT_ID || '',
        instagramClientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
        instagramRedirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'divergram://auth/instagram',
      },
      featureFlags: {
        kakaoLoginEnabled: true
      },
      eas: {
        projectId: '2ad9695c-8e3c-4cf6-a32a-e7f091e69f1a'
      }
    },
    runtimeVersion: '1.2.12-build68'
  } as ExpoConfig;
};
