import { Stack } from 'expo-router';

export default function CallbackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="google" />
      <Stack.Screen name="apple" />
      <Stack.Screen name="facebook" />
      <Stack.Screen name="kakao" />
      <Stack.Screen name="naver" />
    </Stack>
  );
}