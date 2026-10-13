import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { notificationDestination, markNotificationsRead } from '../../src/lib/notificationNavigation';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { apiClient, type NotificationFeedItem } from '../../src/lib/api';

const iconMap: Record<string, typeof Heart> = {
  like: Heart,
  follow: UserPlus,
  comment: MessageCircle,
  mention: MessageCircle,
  system: Bell,
  marine_weather_alert: Bell,
  dive_schedule: Bell,
  sync_complete: CheckCircle2,
  sync_failed: Bell,
  bluetooth_error: Bell,
  certification_status: CheckCircle2,
};

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [marking, setMarking] = useState(false);
  const markingRef = useRef(false);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const colors = useMemo(
    () => ({
      title: isDark ? '#E2E8F0' : '#0F172A',
      subtitle: isDark ? '#94A3B8' : '#64748B',
      cardBg: isDark ? '#0F1B2A' : '#FFFFFF',
      cardBorder: isDark ? '#243447' : '#DCE8F4',
      cardSoft: isDark ? '#162436' : '#F8FBFF',
      cardSoftBorder: isDark ? '#2A3E52' : '#E5EEF7',
      text: isDark ? '#CBD5E1' : '#334155',
      muted: isDark ? '#94A3B8' : '#64748B',
      accent: '#0D5FA8',
    }),
    [isDark]
  );

  const {
    data: rows = [],
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getNotifications(String(user?.id || '')),
  });

  const unread = useMemo(() => rows.filter((row) => row.unread).length, [rows]);

  const markAllRead = async () => {
    if (markingRef.current || !unread) return;
    markingRef.current = true;
    setMarking(true);
    try {
      const result = await markNotificationsRead(rows.filter(row => row.unread).map(row => row.id), id => apiClient.markNotificationRead(id, true));
      await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      if (result.failed) Alert.alert(t('releaseUx.notificationUpdateFailed'), t('releaseUx.notificationPartial', { count: result.failed }));
    } finally { markingRef.current = false; setMarking(false); }
  };

  const renderRow = (row: NotificationFeedItem) => {
    const Icon = iconMap[row.type] || Bell;
    const isPostNotification = Boolean(row.postId) && ['like', 'comment', 'mention'].includes(row.type);
    const leadingImage = isPostNotification ? row.imageUrl : row.type === 'follow' ? row.actor.avatar : row.imageUrl;
    const openRow = async () => {
      if (row.unread) await apiClient.markNotificationRead(row.id, true).catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      const destination = notificationDestination(row);
      if (destination) router.push(destination as never);
      else Alert.alert(row.title || t('tabs.notifications'), row.text || t('releaseUx.notificationNoTarget'));
    };
    return (
      <TouchableOpacity
        key={row.id}
        accessibilityRole="button"
        accessibilityLabel={`${row.title || row.actor.name}. ${row.text}`}
        activeOpacity={0.88}
        onPress={() => void openRow()}
        style={{
          marginBottom: 12,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: row.unread ? colors.cardSoftBorder : colors.cardBorder,
          backgroundColor: colors.cardBg,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {leadingImage ? (
            <Image
              source={{ uri: leadingImage }}
              resizeMode="cover"
              style={{
                width: 52,
                height: 52,
                borderRadius: row.type === 'follow' ? 26 : 14,
                backgroundColor: colors.cardSoft,
                marginRight: 12,
              }}
            />
          ) : (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: row.type === 'follow' ? 26 : 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.cardSoft,
                marginRight: 12,
              }}
            >
              <Icon size={20} color={colors.accent} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, lineHeight: 21, color: colors.text, fontWeight: row.unread ? '700' : '500' }}>
              <Text style={{ color: colors.title, fontWeight: '800' }}>{row.title || row.actor.name}</Text>
              {row.title ? '\n' : ' '}
              {row.text}
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: colors.muted }}>{row.when}</Text>
          </View>
          {row.unread ? <View style={{ marginLeft: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} /> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen safe={false}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.title }}>{t('tabs.notifications')}</Text>
            <Text style={{ marginTop: 4, color: colors.subtitle }}>{t('pages.notifications.subtitle')}</Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <View
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.cardBg,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 13, color: colors.subtitle, fontWeight: '600' }}>{t('releaseUx.unread')}</Text>
                  <Text style={{ marginTop: 4, fontSize: 22, fontWeight: '800', color: colors.title }}>{unread}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={marking || !unread}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: marking || !unread, busy: marking }}
                  onPress={() => void markAllRead()}
                  style={{
                    borderRadius: 999,
                    backgroundColor: colors.accent,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    minHeight: 44,
                    opacity: !unread ? 0.45 : 1,
                  }}
                >
                  {marking ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{t('pages.notifications.markAll')}</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <View
              style={{
                marginBottom: 16,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.cardBg,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[false, true].map(value => <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: onlyUnread === value }} key={String(value)} onPress={() => setOnlyUnread(value)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: onlyUnread === value ? colors.cardSoft : colors.cardBg }}><Text style={{ color: onlyUnread === value ? colors.accent : colors.subtitle, fontSize: 14, fontWeight: '600' }}>{value ? t('releaseUx.unread') : t('releaseUx.allNotifications')}</Text></TouchableOpacity>)}
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {isLoading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : isError && !rows.length ? (
              <TouchableOpacity
                onPress={() => void refetch()}
                style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 20, alignItems: 'center' }}
              >
                <Text style={{ color: colors.title, fontWeight: '800' }}>{t('pages.notifications.loadError')}</Text>
                <Text style={{ marginTop: 6, color: colors.accent, fontWeight: '700' }}>{t('common.tryAgain')}</Text>
              </TouchableOpacity>
            ) : rows.length ? (
              <>{isError && <TouchableOpacity onPress={() => void refetch()}><Text style={{ color: colors.accent, paddingVertical: 12 }}>{t('common.retry')}</Text></TouchableOpacity>}{rows.filter(row => !onlyUnread || row.unread).map(renderRow)}{onlyUnread && unread === 0 ? <Text style={{ padding: 24, color: colors.subtitle, textAlign: 'center' }}>{t('releaseUx.caughtUp')}</Text> : null}</>
            ) : (
              <View
                style={{
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.cardBg,
                  padding: 20,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.subtitle, textAlign: 'center' }}>
                  {t('pages.notifications.empty', { defaultValue: '새로운 알림이 없습니다.' })}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
    </Screen>
  );
}
