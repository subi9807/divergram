import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
      <View style={styles.splash}>
        <Text style={styles.brand}>Divergram</Text>
        <ActivityIndicator color="#ffffff" style={styles.spinner} />
      </View>
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
    gap: 18,
    backgroundColor: '#061323',
  },
  brand: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 8,
  },
});
