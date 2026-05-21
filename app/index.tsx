import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { hasCompletedTutorial } from '../src/lib/tutorial';

export default function Index() {
  const { loading, user } = useAuth();
  const tutorialDone = hasCompletedTutorial();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#0ea5e9" />
      </View>
    );
  }

  if (!tutorialDone) {
    return <Redirect href="/(auth)/tutorial" />;
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/welcome'} />;
}
