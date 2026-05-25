import { Redirect } from 'expo-router';
import { ActivityIndicator, ImageBackground, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../src/hooks/useAuth';
import { hasCompletedTutorial } from '../src/lib/tutorial';
import { hasRequestedCoreRuntimePermissionsOnce, requestCoreRuntimePermissionsOnce } from '../src/lib/runtimePermissions';

const launchSplash = require('../assets/images/splash.png');

export default function Index() {
  const { loading, user } = useAuth();
  const tutorialDone = hasCompletedTutorial();
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const [corePermissionReady, setCorePermissionReady] = useState(() => !tutorialDone || hasRequestedCoreRuntimePermissionsOnce());

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!tutorialDone) {
      setCorePermissionReady(true);
      return;
    }
    if (!minSplashElapsed || loading || corePermissionReady) {
      return;
    }

    let canceled = false;
    const run = async () => {
      try {
        await requestCoreRuntimePermissionsOnce();
      } finally {
        if (!canceled) setCorePermissionReady(true);
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [corePermissionReady, loading, minSplashElapsed, tutorialDone]);

  if (loading || !minSplashElapsed || (tutorialDone && !corePermissionReady)) {
    return (
      <ImageBackground source={launchSplash} resizeMode="cover" style={styles.splash}>
        <View style={styles.overlay} />
        <ActivityIndicator color="#ffffff" />
      </ImageBackground>
    );
  }

  if (!tutorialDone) {
    return <Redirect href="/(auth)/tutorial" />;
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/welcome'} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0EA5E9',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 14, 29, 0.2)',
  },
});
