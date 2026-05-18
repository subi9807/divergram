import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileStats } from '../../src/features/profile/ProfileStats';
import { ProfileAvatar } from '../../src/features/profile/ProfileAvatar';
import { Activity, Edit, MapPin, Settings, ShieldCheck, Star } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const quickLinks = [
    { key: 'saved', label: t('tabs.saved'), icon: Star, path: appRouteMap.saved.path },
    { key: 'activity', label: t('tabs.activity'), icon: Activity, path: appRouteMap.activity.path },
    { key: 'settings', label: t('tabs.settings'), icon: Settings, path: appRouteMap.settings.path },
  ];
  const completion = useMemo(() => {
    const checks = [Boolean(user?.name), Boolean(user?.email), Boolean(profile?.bio), Boolean(profile?.location), Number(profile?.totalDives || 0) > 0];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile?.bio, profile?.location, profile?.totalDives, user?.email, user?.name]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 py-6">
          <View className="mb-5 rounded-3xl border border-surface-200 bg-white p-5 shadow-sm shadow-surface-200">
            <View className="flex-row items-center">
              <ProfileAvatar user={user} size="large" className="border border-surface-200" />
              <View className="ml-4 flex-1">
                <Text className="text-2xl font-bold text-surface-900">{user?.name || t('profile.unnamed')}</Text>
                <Text className="mt-1 text-sm text-surface-500">{user?.email}</Text>
                {profile?.location ? (
                  <View className="mt-2 flex-row items-center">
                    <MapPin size={15} color="#64748b" />
                    <Text className="ml-1 text-sm text-surface-500">{profile.location}</Text>
                  </View>
                ) : null}
                <View className="mt-2 self-start rounded-full bg-brand-50 px-3 py-1">
                  <View className="flex-row items-center">
                    <ShieldCheck size={14} color="#0d5fa8" />
                    <Text className="ml-1 text-xs font-semibold text-brand-700">Divergram Member</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <ProfileStats profile={profile} loading={isLoading} />

          <Card className="mb-5 p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-surface-700">{t('profile.completion.title')}</Text>
              <Text className="text-sm font-bold text-brand-700">{completion}%</Text>
            </View>
            <Text className="mt-1 text-xs text-surface-500">{t('profile.completion.subtitle', { percent: completion })}</Text>
            <View className="mt-3 h-2 rounded-full bg-surface-200">
              <View className="h-2 rounded-full bg-brand-600" style={{ width: `${completion}%` }} />
            </View>
          </Card>

          <Card className="mb-5 p-5">
            <Text className="text-sm font-semibold text-surface-500">{t('profile.about')}</Text>
            <Text className="mt-2 leading-6 text-surface-700">{profile?.bio || t('profile.noBio')}</Text>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 self-start border-brand-200 bg-brand-50"
              onPress={() => router.push(appRouteMap.profile_edit.path as never)}
            >
              <View className="flex-row items-center justify-center">
                <Edit size={16} color="#0d5fa8" />
                <Text className="ml-2 font-semibold text-brand-700">{t('profile.edit')}</Text>
              </View>
            </Button>
          </Card>

          <View className="mb-6">
            <Text className="mb-3 px-1 text-sm font-semibold text-surface-500">{t('menu.quick')}</Text>
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.key}
                  className="mb-2 rounded-2xl border border-surface-200 bg-white px-4 py-4 shadow-sm shadow-surface-200"
                  activeOpacity={0.9}
                  onPress={() => router.push(item.path as never)}
                >
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-100">
                      <Icon size={18} color="#334155" />
                    </View>
                    <Text className="ml-3 flex-1 text-base font-semibold text-surface-900">{item.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
