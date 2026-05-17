import React from 'react';
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
import { Edit, MapPin } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-6 py-8">
          <Card className="items-center py-8 mb-6">
            <ProfileAvatar user={user} size="large" />
            <Text className="text-2xl font-bold text-secondary-800 mt-4">
              {user?.name || t('profile.unnamed')}
            </Text>
            <Text className="text-secondary-600 mt-1">
              {user?.email}
            </Text>
            {profile?.location && (
              <View className="flex-row items-center mt-2">
                <MapPin size={16} color="#64748b" />
                <Text className="text-secondary-600 ml-1">
                  {profile.location}
                </Text>
              </View>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-4 flex-row items-center"
              onPress={() => router.push(appRouteMap.profile_edit.path as never)}
            >
              <Edit size={16} color="#0ea5e9" className="mr-2" />
              {t('profile.edit')}
            </Button>
          </Card>

          <ProfileStats profile={profile} loading={isLoading} />

          <Card className="p-6 mb-6">
            <Text className="text-lg font-semibold text-secondary-800 mb-4">
              {t('profile.about')}
            </Text>
            <Text className="text-secondary-600 leading-6">
              {profile?.bio || t('profile.noBio')}
            </Text>
          </Card>

          <View className="mb-6 flex-row flex-wrap">
            <TouchableOpacity className="w-1/2 pr-1" onPress={() => router.push(appRouteMap.saved.path as never)}>
              <View className="rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="text-sm font-semibold text-gray-900">{t('tabs.saved')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="w-1/2 pl-1" onPress={() => router.push(appRouteMap.activity.path as never)}>
              <View className="rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="text-sm font-semibold text-gray-900">{t('tabs.activity')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="w-full mt-2" onPress={() => router.push(appRouteMap.settings.path as never)}>
              <View className="rounded-2xl border border-gray-200 bg-white p-4">
                <Text className="text-sm font-semibold text-gray-900">{t('tabs.settings')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
