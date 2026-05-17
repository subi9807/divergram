import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight, Globe, HelpCircle, LogOut, Shield } from 'lucide-react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { appRouteMap } from '../../src/config/sitemap';

const languageOptions: ('ko' | 'en' | 'ja' | 'zh')[] = ['ko', 'en', 'ja', 'zh'];

export default function SettingsScreen() {
  const Container = Platform.OS === 'web' ? View : SafeAreaView;
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
    <Container className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="bg-white px-6 py-4 border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">{t('settingsPage.title')}</Text>
          <Text className="text-gray-600 mt-1">{t('settingsPage.subtitle')}</Text>
        </View>

        <View className="bg-white mt-4 mx-4 rounded-2xl shadow-sm p-4 border border-gray-100">
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mr-4">
              <Text className="text-blue-600 text-xl font-bold">{initial}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">{user?.name || t('profile.unnamed')}</Text>
              <Text className="text-gray-600">{user?.email || '-'}</Text>
              <Text className="text-blue-600 text-sm mt-1">{t('settingsPage.profileEdit')}</Text>
            </View>
          </View>
        </View>

        <View className="bg-white mt-4 mx-4 rounded-2xl shadow-sm border border-gray-100">
          <View className="flex-row items-center p-4 border-b border-gray-100">
            <View className="mr-4"><Bell size={20} color="#64748b" /></View>
            <View className="flex-1">
              <Text className="text-gray-900 font-medium">{t('settingsPage.items.notificationsTitle')}</Text>
              <Text className="text-gray-600 text-sm mt-1">{t('settingsPage.items.notificationsSubtitle')}</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={(value) => updateNotificationSetting('pushNotifications', value)}
              trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
              thumbColor="#ffffff"
            />
          </View>

          <View className="p-4 border-b border-gray-100">
            <View className="flex-row items-center mb-3">
              <Globe size={20} color="#64748b" />
              <Text className="text-gray-900 font-medium ml-4">{t('settingsPage.items.languageTitle')}</Text>
            </View>
            <View className="flex-row">
              {languageOptions.map((lng) => (
                <TouchableOpacity
                  key={lng}
                  onPress={() => setLanguage(lng)}
                  className={`mr-2 rounded-full px-4 py-2 border ${language === lng ? 'bg-blue-500 border-blue-500' : 'bg-gray-100 border-gray-200'}`}
                >
                  <Text className={`font-semibold ${language === lng ? 'text-white' : 'text-gray-700'}`}>{t(`settingsPage.languages.${lng}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
            <View className="mr-4"><Shield size={20} color="#64748b" /></View>
            <View className="flex-1">
              <Text className="text-gray-900 font-medium">{t('settingsPage.items.privacyTitle')}</Text>
              <Text className="text-gray-600 text-sm mt-1">{t('settingsPage.items.privacySubtitle')}</Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center p-4">
            <View className="mr-4"><HelpCircle size={20} color="#64748b" /></View>
            <View className="flex-1">
              <Text className="text-gray-900 font-medium">{t('settingsPage.items.supportTitle')}</Text>
              <Text className="text-gray-600 text-sm mt-1">{t('settingsPage.items.supportSubtitle')}</Text>
            </View>
            <ChevronRight size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View className="bg-white mt-4 mx-4 rounded-2xl shadow-sm border border-gray-100 p-2">
          <TouchableOpacity className="flex-row items-center rounded-xl px-3 py-3" onPress={() => router.push(appRouteMap.account.path as never)}>
            <Text className="flex-1 text-gray-900 font-medium">{t('tabs.account')}</Text>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center rounded-xl px-3 py-3" onPress={() => router.push(appRouteMap.activity.path as never)}>
            <Text className="flex-1 text-gray-900 font-medium">{t('tabs.activity')}</Text>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center rounded-xl px-3 py-3" onPress={() => router.push(appRouteMap.report.path as never)}>
            <Text className="flex-1 text-gray-900 font-medium">{t('tabs.report')}</Text>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center rounded-xl px-3 py-3" onPress={() => router.push(appRouteMap.devices.path as never)}>
            <Text className="flex-1 text-gray-900 font-medium">{t('tabs.devices')}</Text>
            <ChevronRight size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View className="bg-white mt-4 mx-4 rounded-2xl shadow-sm p-4 border border-gray-100">
          <Text className="text-gray-900 font-medium mb-2">{t('settingsPage.appInfoTitle')}</Text>
          <Text className="text-gray-600 text-sm">{t('settingsPage.versionLabel', { version })}</Text>
          <Text className="text-gray-600 text-sm">© {new Date().getFullYear()} Divergram</Text>
        </View>

        <View className="mx-4 mt-6 mb-8">
          <TouchableOpacity className="bg-white rounded-2xl shadow-sm p-4 flex-row items-center justify-center border border-red-200" onPress={logout}>
            <LogOut size={20} color="#ef4444" />
            <Text className="text-red-500 font-medium ml-2">{t('settingsPage.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Container>
  );
}
