import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ChevronRight, Globe, HelpCircle, LogOut, Shield } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { appRouteMap } from '../../src/config/sitemap';

const languageOptions: ('ko' | 'en' | 'ja' | 'zh')[] = ['ko', 'en', 'ja', 'zh'];

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const language = useSettingsStore((state) => state.language);
  const pushNotifications = useSettingsStore((state) => state.pushNotifications);
  const updateLanguage = useSettingsStore((state) => state.updateLanguage);
  const updateNotificationSetting = useSettingsStore((state) => state.updateNotificationSetting);

  const version = Constants.expoConfig?.version || '1.0.0';
  const initial = (user?.name || user?.email || 'D').charAt(0).toUpperCase();

  const setLanguage = (lng: 'ko' | 'en' | 'ja' | 'zh') => {
    updateLanguage(lng);
    if (i18n.language !== lng) {
      i18n.changeLanguage(lng);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-4 pt-4">
          <Text className="text-2xl font-bold text-surface-900">{t('settingsPage.title')}</Text>
          <Text className="mt-1 text-surface-500">{t('settingsPage.subtitle')}</Text>
        </View>

        <View className="px-5">
          <LinearGradient colors={['#0d5fa8', '#1198f5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-3xl p-5">
            <View className="flex-row items-center">
              <View className="mr-4 h-16 w-16 items-center justify-center rounded-full bg-white/90">
                <Text className="text-xl font-bold text-brand-700">{initial}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">{user?.name || t('profile.unnamed')}</Text>
                <Text className="mt-0.5 text-blue-100">{user?.email || '-'}</Text>
                <Text className="mt-1 text-sm font-semibold text-white">{t('settingsPage.profileEdit')}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View className="mx-5 mt-4 rounded-3xl border border-surface-200 bg-white shadow-sm shadow-surface-200">
          <View className="flex-row items-center border-b border-surface-100 p-4">
            <View className="mr-4"><Bell size={20} color="#64748b" /></View>
            <View className="flex-1">
              <Text className="font-medium text-surface-900">{t('settingsPage.items.notificationsTitle')}</Text>
              <Text className="mt-1 text-sm text-surface-500">{t('settingsPage.items.notificationsSubtitle')}</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={(value) => updateNotificationSetting('pushNotifications', value)}
              trackColor={{ false: '#dbe3ec', true: '#0d5fa8' }}
              thumbColor="#ffffff"
            />
          </View>

          <View className="border-b border-surface-100 p-4">
            <View className="flex-row items-center mb-3">
              <Globe size={20} color="#64748b" />
              <Text className="ml-4 font-medium text-surface-900">{t('settingsPage.items.languageTitle')}</Text>
            </View>
            <View className="flex-row flex-wrap">
              {languageOptions.map((lng) => (
                <TouchableOpacity
                  key={lng}
                  onPress={() => setLanguage(lng)}
                  className={`mb-2 mr-2 rounded-full border px-4 py-2 ${language === lng ? 'border-brand-600 bg-brand-600' : 'border-surface-200 bg-surface-50'}`}
                >
                  <Text className={`font-semibold ${language === lng ? 'text-white' : 'text-surface-700'}`}>{t(`settingsPage.languages.${lng}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity className="flex-row items-center border-b border-surface-100 p-4">
            <View className="mr-4"><Shield size={20} color="#64748b" /></View>
            <View className="flex-1">
              <Text className="font-medium text-surface-900">{t('settingsPage.items.privacyTitle')}</Text>
              <Text className="mt-1 text-sm text-surface-500">{t('settingsPage.items.privacySubtitle')}</Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center p-4">
            <View className="mr-4"><HelpCircle size={20} color="#64748b" /></View>
            <View className="flex-1">
              <Text className="font-medium text-surface-900">{t('settingsPage.items.supportTitle')}</Text>
              <Text className="mt-1 text-sm text-surface-500">{t('settingsPage.items.supportSubtitle')}</Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View className="mx-5 mt-4 rounded-3xl border border-surface-200 bg-white p-2 shadow-sm shadow-surface-200">
          <TouchableOpacity className="flex-row items-center rounded-2xl px-3 py-3" onPress={() => router.push(appRouteMap.account.path as never)}>
            <Text className="flex-1 font-medium text-surface-900">{t('tabs.account')}</Text>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center rounded-2xl px-3 py-3" onPress={() => router.push(appRouteMap.activity.path as never)}>
            <Text className="flex-1 font-medium text-surface-900">{t('tabs.activity')}</Text>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center rounded-2xl px-3 py-3" onPress={() => router.push(appRouteMap.report.path as never)}>
            <Text className="flex-1 font-medium text-surface-900">{t('tabs.report')}</Text>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center rounded-2xl px-3 py-3" onPress={() => router.push(appRouteMap.devices.path as never)}>
            <Text className="flex-1 font-medium text-surface-900">{t('tabs.devices')}</Text>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View className="mx-5 mt-4 rounded-3xl border border-surface-200 bg-white p-4 shadow-sm shadow-surface-200">
          <Text className="mb-2 font-medium text-surface-900">{t('settingsPage.appInfoTitle')}</Text>
          <Text className="text-sm text-surface-500">{t('settingsPage.versionLabel', { version })}</Text>
          <Text className="text-sm text-surface-500">© {new Date().getFullYear()} Divergram</Text>
        </View>

        <View className="mx-5 mb-10 mt-6">
          <TouchableOpacity className="flex-row items-center justify-center rounded-2xl border border-red-200 bg-white p-4 shadow-sm shadow-surface-200" onPress={logout}>
            <LogOut size={20} color="#ef4444" />
            <Text className="ml-2 font-medium text-red-500">{t('settingsPage.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
