import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { LoadingOverlay } from '../src/components/LoadingOverlay';
import { View } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1">
        <LoadingOverlay visible={true} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}