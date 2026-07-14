import * as Sentry from '@sentry/react-native';
import * as Device from 'expo-device';

const dsn = String(process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();

// The native Sentry SDK currently crashes on the iOS simulator. Production
// devices still initialize Sentry and retain crash reporting.
if (dsn && !__DEV__ && Device.isDevice) {
  Sentry.init({
    dsn,
    environment: 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    enableNativeFramesTracking: true,
  });
}

export { Sentry };
