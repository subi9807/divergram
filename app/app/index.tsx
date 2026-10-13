import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../src/hooks/useAuth';
import { getLayoutPreviewPayload, isLayoutPreviewEnabled } from '../src/lib/layoutPreview';
import { hydrateTutorialCompleted } from '../src/lib/tutorial';

export default function Index() {
  const { loading, user } = useAuth();
  const [bootReady, setBootReady] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(false);
  const [corePermissionReady, setCorePermissionReady] = useState(false);

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

  if (loading || !bootReady || (tutorialDone && !corePermissionReady)) return null;

  if (!tutorialDone) {
    return <Redirect href="/(auth)/tutorial" />;
  }

  const previewRoute = getLayoutPreviewPayload()?.route;
  return <Redirect href={(previewRoute || (user ? '/(tabs)' : '/(auth)/welcome')) as never} />;
}
