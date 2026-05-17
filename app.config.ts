import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Divergram',
  slug: 'divergram',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'divergram',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0EA5E9'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.divergram.app',
    buildNumber: '1',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: '위치 정보는 다이빙 로그 기록에 사용됩니다.',
      NSLocationAlwaysAndWhenInUseUsageDescription: '백그라운드에서 다이빙 경로 추적을 위해 위치 권한이 필요합니다.',
      NSBluetoothAlwaysUsageDescription: '다이빙 장비와의 연결을 위해 블루투스 권한이 필요합니다.',
      NSBluetoothPeripheralUsageDescription: '다이빙 디바이스와의 데이터 교환을 위해 블루투스 권한이 필요합니다.',
      CFBundleURLTypes: [
        {
          CFBundleURLName: 'divergram-app',
          CFBundleURLSchemes: ['divergram']
        }
      ]
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0EA5E9'
    },
    package: 'com.divergram.app',
    versionCode: 1,
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'BLUETOOTH',
      'BLUETOOTH_ADMIN',
      'BLUETOOTH_SCAN',
      'BLUETOOTH_CONNECT',
      'BLUETOOTH_ADVERTISE',
      'POST_NOTIFICATIONS',
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
    orientation: 'portrait',
    startUrl: '/',
    lang: 'ko'
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: '35.0.0'
        },
        ios: {
          deploymentTarget: '15.1'
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
    eas: {
      projectId: '20074629-8c82-4b62-8bc5-6b34ec75593c'
    }
  }
});
