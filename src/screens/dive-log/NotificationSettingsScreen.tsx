import React, { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import type { NotificationSetting, NotificationType } from '../../models';
import { getNotificationSetting, updateNotificationSetting } from '../../services/notificationService';
import { useSettingsStore } from '../../stores/settingsStore';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

const labelMap: Record<NotificationType, string> = {
  like: '좋아요 알림',
  comment: '댓글 알림',
  follow: '팔로우 알림',
  marine_weather_alert: '해양 날씨 경고',
  dive_schedule: '다이빙 일정 알림',
  sync_complete: '로그 동기화 완료',
  sync_failed: '로그 동기화 실패',
  bluetooth_error: 'Bluetooth 연결 오류',
  certification_status: '자격증 인증 상태',
};
const visibleNotificationKeys: NotificationType[] = [
  'like',
  'comment',
  'follow',
  'marine_weather_alert',
  'dive_schedule',
  'sync_complete',
  'sync_failed',
];
const syncNotificationKeys: NotificationType[] = ['dive_schedule', 'sync_complete', 'sync_failed'];

export default function NotificationSettingsScreen() {
  const { isDark } = useResolvedTheme();
  const colors = isDark
    ? {
        title: '#E2E8F0',
        subtitle: '#9FB3C8',
        cardBg: '#0F1B2A',
        cardBorder: '#243447',
        rowBorder: '#243447',
        rowText: '#CBD5E1',
        rowTitle: '#E2E8F0',
        switchFalse: '#334155',
      }
    : {
        title: '#0F172A',
        subtitle: '#64748B',
        cardBg: '#ffffff',
        cardBorder: '#D7E4F1',
        rowBorder: '#EDF2F7',
        rowText: '#334155',
        rowTitle: '#0F172A',
        switchFalse: '#CBD5E1',
      };
  const [setting, setSetting] = useState<NotificationSetting | null>(null);
  const updateNotificationSettingStore = useSettingsStore((state) => state.updateNotificationSetting);
  const updateAllNotificationsStore = useSettingsStore((state) => state.updateAllNotifications);
  const setPushNotificationMaster = useSettingsStore((state) => state.setPushNotificationMaster);

  useEffect(() => {
    getNotificationSetting().then(setSetting);
  }, []);

  const updateItem = async (key: NotificationType, value: boolean) => {
    if (!setting) return;
    const nextItems = { ...setting.items };
    if (syncNotificationKeys.includes(key)) {
      for (const syncKey of syncNotificationKeys) nextItems[syncKey] = value;
    } else {
      nextItems[key] = value;
    }
    const pushEnabled = visibleNotificationKeys.every((itemKey) => nextItems[itemKey]);
    const next = { ...setting, pushEnabled, items: nextItems };
    setSetting(next);
    await updateNotificationSetting(next);

    if (key === 'like') updateNotificationSettingStore('likeNotifications', value);
    if (key === 'comment') updateNotificationSettingStore('commentNotifications', value);
    if (key === 'follow') updateNotificationSettingStore('followNotifications', value);
    if (key === 'marine_weather_alert') updateNotificationSettingStore('diveAlerts', value);
    if (syncNotificationKeys.includes(key)) {
      updateNotificationSettingStore('communityUpdates', value);
    }
    setPushNotificationMaster(pushEnabled);
  };

  const updatePushEnabled = async (value: boolean) => {
    if (!setting) return;
    const nextItems = (Object.keys(setting.items) as NotificationType[]).reduce((acc, key) => {
      acc[key] = value;
      return acc;
    }, {} as NotificationSetting['items']);
    const next = { ...setting, pushEnabled: value, items: nextItems };
    setSetting(next);
    await updateNotificationSetting(next);
    updateAllNotificationsStore(value);
  };

  if (!setting) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: colors.subtitle }}>알림 설정을 불러오는 중...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.title }}>알림 설정 상세</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>필수 알림 항목만 개별 제어할 수 있습니다.</Text>

        <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.rowTitle, fontWeight: '700' }}>푸시 알림 전체</Text>
            <Switch
              value={setting.pushEnabled}
              onValueChange={updatePushEnabled}
              trackColor={{ false: colors.switchFalse, true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 14 }}>
          {visibleNotificationKeys.map((key, index, arr) => (
            <View key={key} style={{ paddingVertical: 10, borderBottomWidth: index === arr.length - 1 ? 0 : 1, borderBottomColor: colors.rowBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.rowText }}>{labelMap[key]}</Text>
              <Switch value={setting.items[key]} onValueChange={(next) => updateItem(key, next)} trackColor={{ false: colors.switchFalse, true: '#0D5FA8' }} thumbColor="#fff" />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
