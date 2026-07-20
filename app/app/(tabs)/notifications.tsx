import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { PermissionGate } from '../../src/components/PermissionGate';
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
  } = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getNotifications(String(user?.id || '')),
  });

  const unread = useMemo(() => rows.filter((row) => row.unread).length, [rows]);

  const markAllRead = async () => {
    await Promise.allSettled(rows.filter((row) => row.unread).map((row) => apiClient.markNotificationRead(row.id, true)));
    await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
  };

  const renderRow = (row: NotificationFeedItem) => {
    const Icon = iconMap[row.type] || Bell;
    const openRow = async () => {
      if (row.unread) await apiClient.markNotificationRead(row.id, true).catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      const raw = String(row.deepLink || '').trim();
      const postQueryId = raw.match(/[?&]post=([^&]+)/)?.[1];
      if (postQueryId) {
        router.push(`/(tabs)/post?post=${encodeURIComponent(decodeURIComponent(postQueryId))}` as never);
      } else if (raw.startsWith('https://divergram.com/posts/') || raw.startsWith('https://www.divergram.com/posts/')) {
        const postId = raw.split('/posts/')[1]?.split(/[?#]/)[0] || '';
        if (postId) router.push(`/(tabs)/post?post=${encodeURIComponent(postId)}` as never);
      } else if (raw.startsWith('divergram://posts/')) {
        router.push(`/(tabs)/post?post=${encodeURIComponent(raw.slice('divergram://posts/'.length))}` as never);
      } else if (row.postId) {
        router.push(`/(tabs)/post?post=${encodeURIComponent(row.postId)}` as never);
      }
    };
    return (
      <TouchableOpacity
        key={row.id}
        activeOpacity={0.88}
        onPress={() => void openRow()}
        style={{
          marginBottom: 12,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: row.unread ? colors.cardSoftBorder : colors.cardBorder,
          backgroundColor: colors.cardBg,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: row.unread ? colors.cardSoft : colors.cardSoft,
              marginRight: 12,
            }}
          >
            <Icon size={20} color={colors.accent} />
          </View>
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
        {row.postId ? (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.cardSoftBorder, paddingTop: 12 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>{t('pages.notifications.relatedPost', { defaultValue: '관련 게시물' })}</Text>
            <Text style={{ marginTop: 4, fontWeight: '700', color: colors.title }} numberOfLines={1}>
              {row.postId}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <PermissionGate
        permission="notifications"
        title={t('permissions.notifications.title')}
        description={t('permissions.notifications.description')}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: colors.title }}>{t('tabs.notifications')}</Text>
            <Text style={{ marginTop: 4, color: colors.subtitle }}>{t('pages.notifications.subtitle')}</Text>
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.cardBg,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 13, color: colors.subtitle, fontWeight: '700' }}>{t('brand.tagline')}</Text>
                  <Text style={{ marginTop: 4, fontSize: 22, fontWeight: '800', color: colors.title }}>{unread}</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => void markAllRead()}
                  style={{
                    borderRadius: 999,
                    backgroundColor: colors.accent,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{t('pages.notifications.markAll')}</Text>
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
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.title }}>{t('pages.notifications.summaryTitle', { defaultValue: '알림 요약' })}</Text>
              <Text style={{ marginTop: 6, color: colors.subtitle, lineHeight: 20 }}>
                {t('pages.notifications.summaryBody', { defaultValue: '좋아요, 댓글, 팔로우, 날씨 및 동기화 알림을 한곳에서 확인합니다.' })}
              </Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {isLoading ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : rows.length ? (
              rows.map(renderRow)
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
      </PermissionGate>
    </Screen>
  );
}
