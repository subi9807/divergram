import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, BookOpen, Bookmark, House, MapPin, MessageCircle, Search, Store, User } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';
import { DgTabHeader } from '../../src/components/DgTabHeader';
import { useAuth } from '../../src/hooks/useAuth';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { bottomTabCandidates, type BottomTabRoute, useSettingsStore } from '../../src/stores/settingsStore';

function tabIcon(Icon: typeof House, isDark: boolean) {
  function TabBarIcon({ size, color, focused }: { size: number; color: string; focused: boolean }) {
    return (
      <View style={[styles.iconWrap, focused ? (isDark ? styles.iconWrapActiveDark : styles.iconWrapActive) : null]}>
        <Icon size={size - 1} color={focused ? (isDark ? '#7dd3fc' : '#0d5fa8') : color} />
      </View>
    );
  }

  return TabBarIcon;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const { loading, user } = useAuth();
  const { isDark } = useResolvedTheme();
  const bottomTabItems = useSettingsStore((state) => state.bottomTabItems);

  const tabMeta: Record<BottomTabRoute, { icon: typeof House; titleKey: string }> = {
    index: { icon: House, titleKey: appRouteMap.home.titleKey },
    explore: { icon: Search, titleKey: appRouteMap.explore.titleKey },
    location: { icon: MapPin, titleKey: appRouteMap.location.titleKey },
    logs: { icon: BookOpen, titleKey: appRouteMap.logs.titleKey },
    profile: { icon: User, titleKey: appRouteMap.profile.titleKey },
    messages: { icon: MessageCircle, titleKey: appRouteMap.messages.titleKey },
    notifications: { icon: Bell, titleKey: appRouteMap.notifications.titleKey },
    saved: { icon: Bookmark, titleKey: appRouteMap.saved.titleKey },
    resorts: { icon: Store, titleKey: appRouteMap.resorts.titleKey },
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0d5fa8" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        header: ({ options }) => <DgTabHeader title={String(options.title || '')} />,
        tabBarActiveTintColor: isDark ? '#7dd3fc' : '#0d5fa8',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#6f8193',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: isDark ? '#0b1520' : '#ffffff',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#1f2f41' : '#d7e4f1',
          elevation: 10,
          shadowColor: isDark ? '#020617' : '#0d5fa8',
          shadowOpacity: isDark ? 0.4 : 0.13,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          height: 76,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        tabBarItemStyle: {
          height: 54,
        },
      }}
    >
      {bottomTabItems.map((routeName) => {
        const meta = tabMeta[routeName];
        return <Tabs.Screen key={`tab-${routeName}`} name={routeName} options={{ title: t(meta.titleKey), tabBarIcon: tabIcon(meta.icon, isDark) }} />;
      })}
      {bottomTabCandidates
        .filter((routeName) => !bottomTabItems.includes(routeName))
        .map((routeName) => (
          <Tabs.Screen key={`hidden-tab-${routeName}`} name={routeName} options={{ href: null }} />
        ))}
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="reels" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="activity" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="post" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="profile-edit" options={{ href: null }} />
      <Tabs.Screen name="devices" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="settings-detail" options={{ href: null }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#e8f4ff',
  },
  iconWrapActiveDark: {
    backgroundColor: '#1e3a57',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
});
