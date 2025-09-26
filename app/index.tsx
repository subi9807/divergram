import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { WebViewScreen } from '../src/components/WebViewScreen';

export default function Index() {
  // 웹 플랫폼에서는 divergram.com으로 리다이렉트
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.href = 'https://divergram.com';
    }
    return null;
  }

  // 모바일에서는 웹뷰로 divergram.com 표시
  return <WebViewScreen />;
}