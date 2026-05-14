import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileStats } from '../../src/features/profile/ProfileStats';
import { ProfileAvatar } from '../../src/features/profile/ProfileAvatar';
import { Edit, MapPin } from 'lucide-react-native';

export default function ProfileScreen() {
  const { t } = useTranslation();
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
        </View>
      </ScrollView>
    </Screen>
  );
}