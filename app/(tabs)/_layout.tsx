import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Home, BookOpen, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          // 웹에서 탭바 높이 조정
          height: Platform.OS === 'web' ? 60 : undefined,
          paddingBottom: Platform.OS === 'web' ? 8 : undefined,
        },
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'web' ? 12 : undefined,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: '다이빙 로그',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}