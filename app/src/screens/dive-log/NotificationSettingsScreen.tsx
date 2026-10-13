import React, { useEffect, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import type { NotificationSetting, NotificationType } from '../../models';
import { getNotificationSetting, updateNotificationSetting } from '../../services/notificationService';
import { useSettingsStore } from '../../stores/settingsStore';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
          <Text style={{ color: colors.subtitle }}>{t('notificationDetail.loading')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.title }}>{t('notificationDetail.title')}</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>{t('notificationDetail.description')}</Text>

        <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.rowTitle, fontWeight: '700' }}>{t('notificationDetail.master')}</Text>
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
              <Text style={{ color: colors.rowText }}>{t(`notificationDetail.items.${key}`)}</Text>
              <Switch value={setting.items[key]} onValueChange={(next) => updateItem(key, next)} trackColor={{ false: colors.switchFalse, true: '#0D5FA8' }} thumbColor="#fff" />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
