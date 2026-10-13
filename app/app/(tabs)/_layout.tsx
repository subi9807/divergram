import React, { useMemo } from 'react';
import { Activity, Award, Bell, BookOpen, Bookmark, CalendarDays, Crown, Fish, GraduationCap, HandCoins, House, Info, MapPin, MessageCircle, Play, Search, Settings, ShieldCheck, Store, User } from 'lucide-react-native';
import { ActivityIndicator, ColorValue, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { appRouteMap } from '../../src/config/sitemap';
import { DgTabHeader } from '../../src/components/DgTabHeader';
import { useAuth } from '../../src/hooks/useAuth';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { bottomTabCandidates, bottomTabDefault, type BottomTabRoute, useSettingsStore } from '../../src/stores/settingsStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { floatingTabGeometry } from '../../src/utils/navigationChrome';

function tabIcon(Icon: typeof House, isDark: boolean) {
  function TabBarIcon({ size, color, focused }: { size: number; color: ColorValue; focused: boolean }) {
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
  const { loading, user, accountDeletion, accountDeletionLoading } = useAuth();
  const { isDark } = useResolvedTheme();
  const insets = useSafeAreaInsets();
  const bottomTabItemsRaw = useSettingsStore((state) => state.bottomTabItems);
  const bottomTabItems = useMemo(() => {
    const seen = new Set<BottomTabRoute>();
    const normalized: BottomTabRoute[] = [];
    for (const route of bottomTabItemsRaw) {
      if (!bottomTabCandidates.includes(route)) continue;
      if (seen.has(route)) continue;
      seen.add(route);
      normalized.push(route);
    }
    if (!seen.has('index')) {
      normalized.unshift('index');
      seen.add('index');
    }
    if (normalized.length < 4) {
      for (const route of bottomTabDefault) {
        if (!bottomTabCandidates.includes(route)) continue;
        if (seen.has(route)) continue;
        normalized.push(route);
        seen.add(route);
        if (normalized.length >= 4) break;
      }
    }
    return normalized.slice(0, 6);
  }, [bottomTabItemsRaw]);

  const tabMeta: Record<BottomTabRoute, { icon: typeof House; titleKey: string }> = {
    index: { icon: House, titleKey: appRouteMap.home.titleKey },
    explore: { icon: Search, titleKey: appRouteMap.explore.titleKey },
    location: { icon: MapPin, titleKey: appRouteMap.location.titleKey },
    logs: { icon: BookOpen, titleKey: appRouteMap.logs.titleKey },
    profile: { icon: User, titleKey: appRouteMap.profile.titleKey },
    messages: { icon: MessageCircle, titleKey: appRouteMap.messages.titleKey },
    notifications: { icon: Bell, titleKey: appRouteMap.notifications.titleKey },
    resorts: { icon: Store, titleKey: appRouteMap.resorts.titleKey },
    reels: { icon: Play, titleKey: appRouteMap.reels.titleKey },
    saved: { icon: Bookmark, titleKey: appRouteMap.saved.titleKey },
    stamps: { icon: Award, titleKey: appRouteMap.stamps.titleKey },
    'license-management': { icon: ShieldCheck, titleKey: appRouteMap.license_management.titleKey },
    activity: { icon: Activity, titleKey: appRouteMap.activity.titleKey },
    settings: { icon: Settings, titleKey: appRouteMap.settings.titleKey },
    donate: { icon: HandCoins, titleKey: appRouteMap.donate.titleKey },
    'booking-history': { icon: CalendarDays, titleKey: appRouteMap.booking_history.titleKey },
    'dive-education': { icon: GraduationCap, titleKey: appRouteMap.dive_education.titleKey },
    'dive-guide': { icon: BookOpen, titleKey: appRouteMap.dive_guide.titleKey },
    'dive-discovery': { icon: Fish, titleKey: appRouteMap.dive_discovery.titleKey },
    'app-info': { icon: Info, titleKey: appRouteMap.app_info.titleKey },
    'membership': { icon: Crown, titleKey: appRouteMap.membership.titleKey },
  };

  if (loading || (Boolean(user) && accountDeletionLoading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0d5fa8" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (accountDeletion?.pending) {
    return <Redirect href="/(auth)/account-recovery" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#09131d' : '#f8fbfe' }}>
    <Tabs
      initialRouteName="index"
      backBehavior="history"
      screenOptions={{
        header: ({ options }) => <DgTabHeader title={String(options.title || '')} />,
        tabBarActiveTintColor: isDark ? '#7dd3fc' : '#0d5fa8',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#6f8193',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          ...floatingTabGeometry(insets),
          backgroundColor: isDark ? '#0b1520' : '#ffffff',
          borderWidth: 1,
          borderTopWidth: 1,
          borderColor: isDark ? '#1f2f41' : '#d7e4f1',
          borderTopColor: isDark ? '#1f2f41' : '#d7e4f1',
          elevation: 10,
          shadowColor: isDark ? '#020617' : '#0d5fa8',
          shadowOpacity: isDark ? 0.4 : 0.13,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 4 },
        },
        tabBarLabelStyle: {
          fontSize: bottomTabItems.length >= 6 ? 10 : 12,
          fontWeight: '600',
        },
        tabBarItemStyle: {
          height: 54,
        },
      }}
    >
      {bottomTabItems.map((routeName) => {
        const meta = tabMeta[routeName];
        return <Tabs.Screen key={`tab-${routeName}`} name={routeName} options={{ title: t(meta.titleKey), tabBarIcon: tabIcon(meta.icon, isDark), ...(routeName === 'reels' ? { headerShown: false } : {}) }} />;
      })}
      {bottomTabCandidates
        .filter((routeName) => !bottomTabItems.includes(routeName))
        .map((routeName) => (
          <Tabs.Screen key={`hidden-tab-${routeName}`} name={routeName} options={{ href: null, ...(routeName === 'reels' ? { headerShown: false } : {}) }} />
        ))}
      <Tabs.Screen name="create" options={{ href: null }} />
      <Tabs.Screen name="app-info" options={{ href: null }} />
      <Tabs.Screen name="membership" options={{ href: null }} />
      <Tabs.Screen name="donate" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="account" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="post" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="profile-edit" options={{ href: null }} />
      <Tabs.Screen name="dive-log-management" options={{ href: null }} />
      <Tabs.Screen name="dive-log-detail" options={{ href: null }} />
      <Tabs.Screen name="dive-log-archive" options={{ href: null }} />
      <Tabs.Screen name="dive-log-edit" options={{ href: null }} />
      <Tabs.Screen name="dive-import" options={{ href: null }} />
      <Tabs.Screen name="integration-settings" options={{ href: null }} />
      <Tabs.Screen name="marine-weather" options={{ href: null }} />
      <Tabs.Screen name="bluetooth-devices" options={{ href: null }} />
      <Tabs.Screen name="certifications" options={{ href: null }} />
      <Tabs.Screen name="notification-settings" options={{ href: null }} />
      <Tabs.Screen name="ai-settings" options={{ href: null }} />
      <Tabs.Screen name="policy-center" options={{ href: null }} />
      <Tabs.Screen name="policy-document" options={{ href: null }} />
      <Tabs.Screen name="terms-policy" options={{ href: null }} />
      <Tabs.Screen name="privacy-policy" options={{ href: null }} />
      <Tabs.Screen name="location-policy" options={{ href: null }} />
      <Tabs.Screen name="community-policy" options={{ href: null }} />
      <Tabs.Screen name="safety-disclaimer" options={{ href: null }} />
      <Tabs.Screen name="ai-usage-policy" options={{ href: null }} />
      <Tabs.Screen name="open-source-licenses" options={{ href: null }} />
      <Tabs.Screen name="devices" options={{ href: null }} />
      <Tabs.Screen name="settings-detail" options={{ href: null }} />
      <Tabs.Screen name="feed" options={{ href: null }} />
      <Tabs.Screen name="resort-detail" options={{ href: null }} />
      <Tabs.Screen name="resort-booking" options={{ href: null }} />
      <Tabs.Screen name="resort-booking-detail" options={{ href: null }} />
      <Tabs.Screen name="resort-checkin" options={{ href: null }} />
      <Tabs.Screen name="dive-guide-detail" options={{ href: null, title: t('diveGuide.menuTitle') }} />
      <Tabs.Screen name="marine-life-detail" options={{ href: null, title: t('marineLife.detail.title') }} />
      </Tabs>
    </View>
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
