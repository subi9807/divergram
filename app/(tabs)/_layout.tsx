import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { House, MessageCircle, PlusCircle, Search, User } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';
import { DgTabHeader } from '../../src/components/DgTabHeader';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        header: ({ options }) => <DgTabHeader title={String(options.title || '')} />,
        tabBarActiveTintColor: '#1198f5',
        tabBarInactiveTintColor: '#7b8a99',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#dce7f3',
          elevation: 0,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
          height: 82,
          paddingTop: 8,
          paddingBottom: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t(appRouteMap.home.titleKey), tabBarIcon: ({ size, color }) => <House size={size} color={color} /> }} />
      <Tabs.Screen name="explore" options={{ title: t(appRouteMap.explore.titleKey), tabBarIcon: ({ size, color }) => <Search size={size} color={color} /> }} />
      <Tabs.Screen name="create" options={{ title: t(appRouteMap.create.titleKey), tabBarIcon: ({ size, color }) => <PlusCircle size={size} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: t(appRouteMap.messages.titleKey), tabBarIcon: ({ size, color }) => <MessageCircle size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t(appRouteMap.profile.titleKey), tabBarIcon: ({ size, color }) => <User size={size} color={color} /> }} />
      <Tabs.Screen name="resorts" options={{ href: null }} />
      <Tabs.Screen name="reels" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="location" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="saved" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="post" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="profile-edit" options={{ href: null }} />
      <Tabs.Screen name="devices" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
      <Tabs.Screen name="logs" options={{ href: null }} />
    </Tabs>
  );
}
