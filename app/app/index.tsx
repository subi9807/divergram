import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, StatusBar, StyleSheet, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { isLayoutPreviewEnabled } from '../src/lib/layoutPreview';
import { hydrateTutorialCompleted } from '../src/lib/tutorial';

export default function Index() {
  const { loading, user } = useAuth();
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const [bootReady, setBootReady] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [corePermissionReady, setCorePermissionReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      const completedTutorial = isLayoutPreviewEnabled() ? true : await hydrateTutorialCompleted();
      if (canceled) return;

      setTutorialDone(completedTutorial);
      setCorePermissionReady(true);

      setBootReady(true);
    };

    run();

    return () => {
      canceled = true;
    };
  }, []);

  if (loading || !bootReady || !minSplashElapsed || (tutorialDone && !corePermissionReady)) {
    return (
      <ImageBackground
        source={require('../assets/images/splash.png')}
        resizeMode="cover"
        style={styles.splash}
      >
        <StatusBar barStyle="light-content" backgroundColor="#061323" translucent={false} />
        <View pointerEvents="none" style={styles.overlay} />
        <ActivityIndicator color="#ffffff" size="large" style={styles.spinner} />
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
    backgroundColor: '#061323',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(3, 15, 29, 0.08)',
  },
  spinner: {
    position: 'absolute',
    bottom: '13%',
  },
});
