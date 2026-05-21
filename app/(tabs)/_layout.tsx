import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookOpen, House, MapPin, Search, User } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';
import { DgTabHeader } from '../../src/components/DgTabHeader';
import { useAuth } from '../../src/hooks/useAuth';

function tabIcon(Icon: typeof House) {
  function TabBarIcon({ size, color, focused }: { size: number; color: string; focused: boolean }) {
    return (
      <View style={[styles.iconWrap, focused ? styles.iconWrapActive : null]}>
        <Icon size={size - 1} color={focused ? '#0d5fa8' : color} />
      </View>
    );
  }

  return TabBarIcon;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const { loading, user } = useAuth();

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
        tabBarActiveTintColor: '#0d5fa8',
        tabBarInactiveTintColor: '#6f8193',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#d7e4f1',
          elevation: 10,
          shadowColor: '#0d5fa8',
          shadowOpacity: 0.13,
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
      <Tabs.Screen name="index" options={{ title: t(appRouteMap.home.titleKey), tabBarIcon: tabIcon(House) }} />
      <Tabs.Screen name="explore" options={{ title: t(appRouteMap.explore.titleKey), tabBarIcon: tabIcon(Search) }} />
      <Tabs.Screen name="location" options={{ title: t(appRouteMap.location.titleKey), tabBarIcon: tabIcon(MapPin) }} />
      <Tabs.Screen name="logs" options={{ title: t(appRouteMap.logs.titleKey), tabBarIcon: tabIcon(BookOpen) }} />
      <Tabs.Screen name="profile" options={{ title: t(appRouteMap.profile.titleKey), tabBarIcon: tabIcon(User) }} />
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="resorts" options={{ href: null }} />
      <Tabs.Screen name="reels" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
