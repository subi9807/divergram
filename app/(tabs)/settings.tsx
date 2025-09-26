import React from 'react';
import { View, Text, ScrollView, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { ListItem } from '../../src/components/ListItem';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/hooks/useAuth';
import { useSettings } from '../../src/hooks/useSettings';
import { 
  Bell, 
  Globe, 
  Shield, 
  Download, 
  LogOut,
  ChevronRight 
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { settings, updateSetting } = useSettings();

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutTitle'),
      t('settings.logoutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('settings.logout'),
          style: 'destructive',
          onPress: logout
        }
      ]
    );
  };

  const changeLanguage = () => {
    const languages = [
      { code: 'ko', name: '한국어' },
      { code: 'en', name: 'English' },
      { code: 'ja', name: '日本語' }
    ];

    Alert.alert(
      t('settings.language'),
      '',
      languages.map(lang => ({
        text: lang.name,
        onPress: () => {
          i18n.changeLanguage(lang.code);
          updateSetting('language', lang.code);
        }
      })).concat([
        { text: t('common.cancel'), style: 'cancel' }
      ])
    );
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8">
          <Text className="text-2xl font-bold text-secondary-800 mb-6">
            {t('settings.title')}
          </Text>

          <Card className="mb-6">
            <Text className="text-lg font-semibold text-secondary-800 mb-4 px-6 pt-4">
              {t('settings.notifications')}
            </Text>
            <ListItem
              icon={<Bell size={20} color="#64748b" />}
              title={t('settings.pushNotifications')}
              subtitle={t('settings.pushNotificationsDesc')}
              rightComponent={
                <Switch
                  value={settings?.pushNotifications ?? true}
                  onValueChange={(value) => updateSetting('pushNotifications', value)}
                  trackColor={{ false: '#e2e8f0', true: '#0ea5e9' }}
                  thumbColor="#ffffff"
                />
              }
            />
          </Card>

          <Card className="mb-6">
            <Text className="text-lg font-semibold text-secondary-800 mb-4 px-6 pt-4">
              {t('settings.preferences')}
            </Text>
            <ListItem
              icon={<Globe size={20} color="#64748b" />}
              title={t('settings.language')}
              subtitle={t('settings.languageDesc')}
              rightComponent={<ChevronRight size={20} color="#64748b" />}
              onPress={changeLanguage}
            />
          </Card>

          <Card className="mb-6">
            <Text className="text-lg font-semibold text-secondary-800 mb-4 px-6 pt-4">
              {t('settings.permissions')}
            </Text>
            <ListItem
              icon={<Shield size={20} color="#64748b" />}
              title={t('settings.permissions')}
              subtitle={t('settings.permissionsDesc')}
              rightComponent={<ChevronRight size={20} color="#64748b" />}
              onPress={() => router.push('/settings/permissions')}
            />
          </Card>

          <Card className="mb-6">
            <Text className="text-lg font-semibold text-secondary-800 mb-4 px-6 pt-4">
              {t('settings.data')}
            </Text>
            <ListItem
              icon={<Download size={20} color="#64748b" />}
              title={t('settings.exportData')}
              subtitle={t('settings.exportDataDesc')}
              rightComponent={<ChevronRight size={20} color="#64748b" />}
              onPress={() => {/* TODO: Implement data export */}}
            />
          </Card>

          <View className="mt-8">
            <Button
              onPress={handleLogout}
              variant="outline"
              size="lg"
              className="w-full flex-row items-center border-danger-300"
            >
              <LogOut size={20} color="#ef4444" className="mr-3" />
              <Text className="text-danger-500 font-semibold">
                {t('settings.logout')}
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}