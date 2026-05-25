import { ExpoConfig, ConfigContext } from 'expo/config';

function getGoogleIosClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || process.env.GOOGLE_CLIENT_ID_IOS || '';
}

function getGoogleMapsApiKey(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
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

  return {
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
      resizeMode: 'cover',
      backgroundColor: '#0EA5E9'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.divergram.app.ios',
      buildNumber: '1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: '위치 정보는 다이빙 로그 기록에 사용됩니다.',
        NSLocationAlwaysAndWhenInUseUsageDescription: '백그라운드에서 다이빙 경로 추적을 위해 위치 권한이 필요합니다.',
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
      'expo-image-picker',
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
      googleMapsApiKey,
      eas: {
        projectId: '20074629-8c82-4b62-8bc5-6b34ec75593c'
      }
    }
  };
};
