import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';

const dsn = String(process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();
const isValidDsn = /^https?:\/\/[^@\s]+@[^/\s]+\/.+/.test(dsn);

if (isValidDsn && !__DEV__) {
  // Expo 56 / RN 0.85 can crash while starting Sentry's native iOS SDK.
  // Keep JS reporting on iOS and retain full native reporting on Android.
  const enableNative = Platform.OS !== 'ios';

  Sentry.init({
    dsn,
    environment: 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    enableNative,
    enableNativeFramesTracking: enableNative,
  });
}

export { Sentry };
