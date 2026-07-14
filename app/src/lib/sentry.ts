import * as Sentry from '@sentry/react-native';

const dsn = String(process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn) && !__DEV__,
  environment: __DEV__ ? 'development' : 'production',
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
  enableNativeFramesTracking: true,
});

export { Sentry };
