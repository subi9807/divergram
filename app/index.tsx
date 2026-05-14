import { Redirect } from 'expo-router';

export default function Index() {
  // 모든 플랫폼에서 탭 화면으로 리다이렉트
  return <Redirect href="/(tabs)" />;
}