import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileStats } from '../../src/features/profile/ProfileStats';
import { ProfileAvatar } from '../../src/features/profile/ProfileAvatar';
import { Activity, ChevronRight, Edit3, MapPin, Settings, ShieldCheck, Star } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';

const SHOW_PROFILE_CARD_GUIDE = false;

const PROFILE_CARD_UI = {
  outerRadius: 34,
  outerPadding: 16,
  outerGapToStats: 32,
  innerRadius: 26,
  innerPadding: 16,
  headerBottomGap: 4,
  summaryRadius: 22,
  summaryPaddingX: 16,
  summaryPaddingY: 16,
  bioRadius: 16,
  bioTopGap: 16,
  bioPaddingX: 12,
  bioPaddingY: 12,
  editTopGap: 10,
} as const;

function levelLabel(t: any, mode: 'scuba' | 'freediving', key: string): string {
  const value = String(key || '').trim();
  if (!value || value === 'none') return '';
  if (mode === 'scuba') {
    if (value === 'instructor' || value === 'trainer' || value === 'course_director') {
      return t(`pages.profileEdit.commonLevels.${value}` as any, { defaultValue: value });
    }
    return t(`pages.profileEdit.scubaLevels.${value}` as any, { defaultValue: value });
  }
  if (value === 'instructor' || value === 'trainer' || value === 'course_director') {
    return t(`pages.profileEdit.commonLevels.${value}` as any, { defaultValue: value });
  }
  return t(`pages.profileEdit.freedivingLevels.${value}` as any, { defaultValue: value });
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const quickLinks = [
    {
      key: 'saved',
      label: t('profile.quick.favoritesLabel', { defaultValue: '즐겨찾기' }),
      description: t('profile.quick.savedDesc', { defaultValue: '저장한 게시물과 리조트' }),
      icon: Star,
      path: appRouteMap.saved.path,
    },
    {
      key: 'activity',
      label: t('tabs.activity'),
      description: t('profile.quick.activityDesc', { defaultValue: '좋아요, 댓글, 팔로우 활동' }),
      icon: Activity,
      path: appRouteMap.activity.path,
    },
    {
      key: 'settings',
      label: t('tabs.settings'),
      description: t('profile.quick.settingsDesc', { defaultValue: '알림, 언어, 계정 보안' }),
      icon: Settings,
      path: appRouteMap.settings.path,
    },
  ];

  const displayName = profile?.full_name || profile?.username || user?.name || t('profile.unnamed');
  const displayAvatar = profile?.avatar_url || user?.avatar;
  const displayHandle = profile?.username ? `@${profile.username}` : '';
  const displayBio = profile?.bio || t('profile.noBio');
  const displayLocation = profile?.location;
  const scubaLevelKey = String(profile?.scuba_level || '').trim();
  const freedivingLevelKey = String(profile?.freediving_level || '').trim();
  const scubaLevelLabel = levelLabel(t, 'scuba', scubaLevelKey);
  const freedivingLevelLabel = levelLabel(t, 'freediving', freedivingLevelKey);
  const diveLevelKey = String(profile?.diving_level || '').trim();
  const diveLevelLabel = diveLevelKey
    ? t(`profile.diveLevels.${diveLevelKey}` as any, { defaultValue: diveLevelKey })
    : '';

  const completion = useMemo(() => {
    const checks = [
      Boolean(displayName),
      Boolean(user?.email),
      Boolean(displayAvatar),
      Boolean(profile?.bio),
      Boolean(profile?.location),
      Number(profile?.totalDives || 0) > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [displayAvatar, displayName, profile?.bio, profile?.location, profile?.totalDives, user?.email]);
  const completionColor = completion >= 80 ? '#0ea5a4' : completion >= 50 ? '#0d5fa8' : '#f59e0b';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pt-6">
          <View
            className="overflow-hidden"
            style={{ borderRadius: PROFILE_CARD_UI.outerRadius, marginBottom: PROFILE_CARD_UI.outerGapToStats }}
          >
            <LinearGradient
              colors={['#0d5fa8', '#1198f5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: PROFILE_CARD_UI.outerRadius,
                padding: PROFILE_CARD_UI.outerPadding,
                borderWidth: 1,
                borderColor: '#6da7d2',
              }}
            >
              <View className="absolute -right-12 -top-10 h-36 w-36 rounded-full bg-white/10" />
              <View className="absolute -bottom-16 -left-12 h-44 w-44 rounded-full bg-sky-300/15" />
              <View
                className="relative overflow-hidden border border-white/20 bg-white/8"
                style={{
                  borderRadius: PROFILE_CARD_UI.innerRadius,
                  padding: PROFILE_CARD_UI.innerPadding,
                }}
              >
              {SHOW_PROFILE_CARD_GUIDE ? (
                <Text className="mb-1 self-start rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  1
                </Text>
              ) : null}
              <View className="flex-row items-center justify-between" style={{ marginBottom: PROFILE_CARD_UI.headerBottomGap }}>
                <View className="self-start rounded-full bg-white/15 px-3 py-1">
                  <View className="flex-row items-center">
                    <ShieldCheck size={14} color="#e0f2fe" />
                    <Text className="ml-1 text-xs font-semibold text-sky-100">
                      {t('profile.memberBadge', { defaultValue: 'Divergram Member' })}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center rounded-2xl bg-white/20"
                  activeOpacity={0.88}
                  onPress={() => router.push(appRouteMap.settings.path as never)}
                >
                  <Settings size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {SHOW_PROFILE_CARD_GUIDE ? (
                <Text className="mb-1 self-start rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  2
                </Text>
              ) : null}
              <View
                className="bg-white/14"
                style={{
                  borderRadius: PROFILE_CARD_UI.summaryRadius,
                  paddingHorizontal: PROFILE_CARD_UI.summaryPaddingX,
                  paddingVertical: PROFILE_CARD_UI.summaryPaddingY,
                }}
              >
                <View className="flex-row items-center">
                  {displayAvatar ? (
                    <ProfileAvatar
                      user={{ name: displayName, avatar: displayAvatar }}
                      size="large"
                      className="border-2 border-white/60"
                    />
                  ) : (
                    <View className="h-20 w-20 items-center justify-center rounded-full border-2 border-white/60 bg-white/95">
                      <Image source={require('../../assets/images/logo.png')} className="h-11 w-11" resizeMode="contain" />
                    </View>
                  )}
                  <View className="ml-4 flex-1">
                    <Text className="text-2xl font-bold text-white">{displayName}</Text>
                    {displayHandle ? <Text className="mt-1 text-sm text-sky-100">{displayHandle}</Text> : null}
                    {scubaLevelLabel || freedivingLevelLabel || diveLevelLabel ? (
                      <View className="mt-2 flex-row flex-wrap">
                        {scubaLevelLabel ? (
                          <View className="mb-1 mr-1 self-start rounded-full bg-white/22 px-2.5 py-1">
                            <Text className="text-[11px] font-semibold text-white">
                              {t('logsForm.diveTypes.scuba', { defaultValue: 'Scuba' })} · {scubaLevelLabel}
                            </Text>
                          </View>
                        ) : null}
                        {freedivingLevelLabel ? (
                          <View className="mb-1 mr-1 self-start rounded-full bg-white/22 px-2.5 py-1">
                            <Text className="text-[11px] font-semibold text-white">
                              {t('logsForm.diveTypes.freediving', { defaultValue: 'Freediving' })} · {freedivingLevelLabel}
                            </Text>
                          </View>
                        ) : null}
                        {!scubaLevelLabel && !freedivingLevelLabel && diveLevelLabel ? (
                          <View className="mb-1 mr-1 self-start rounded-full bg-white/22 px-2.5 py-1">
                            <Text className="text-[11px] font-semibold text-white">{diveLevelLabel}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {displayLocation ? (
                      <View className="mt-2 flex-row items-center">
                        <MapPin size={14} color="#e0f2fe" />
                        <Text className="ml-1 text-sm text-sky-100">{displayLocation}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {SHOW_PROFILE_CARD_GUIDE ? (
                  <Text
                    className="mt-3 self-start rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-semibold text-white/90"
                    style={{ marginLeft: -PROFILE_CARD_UI.summaryPaddingX }}
                  >
                    3
                  </Text>
                ) : null}
                <View
                  className="bg-black/10"
                  style={{
                    marginTop: PROFILE_CARD_UI.bioTopGap,
                    borderRadius: PROFILE_CARD_UI.bioRadius,
                    paddingHorizontal: PROFILE_CARD_UI.bioPaddingX,
                    paddingVertical: PROFILE_CARD_UI.bioPaddingY,
                  }}
                >
                  <Text className="text-[14px] leading-5 text-white/95">{displayBio}</Text>
                </View>
              </View>

              {SHOW_PROFILE_CARD_GUIDE ? (
                <Text className="mt-2 self-start rounded-full bg-white/18 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  4
                </Text>
              ) : null}
              <View style={{ marginTop: PROFILE_CARD_UI.editTopGap }}>
                <TouchableOpacity
                  className="rounded-2xl bg-white px-4 py-3"
                  activeOpacity={0.88}
                  onPress={() => router.push(appRouteMap.profile_edit.path as never)}
                >
                  <View className="flex-row items-center justify-center">
                    <Edit3 size={16} color="#0d5fa8" />
                    <Text className="ml-2 font-semibold text-brand-700">{t('profile.edit')}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              </View>
            </LinearGradient>
          </View>

          <ProfileStats profile={profile} loading={isLoading} />

          <Card className="mb-5 p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-surface-700">{t('profile.completion.title')}</Text>
              <View className="rounded-full bg-brand-50 px-3 py-1">
                <Text className="text-xs font-bold text-brand-700">{completion}%</Text>
              </View>
            </View>
            <View className="mt-3 h-2 overflow-hidden rounded-full bg-surface-200">
              <View className="h-2 rounded-full" style={{ width: `${completion}%`, backgroundColor: completionColor }} />
            </View>
            <Text className="mt-2 text-xs text-surface-500">{t('profile.completion.subtitle', { percent: completion })}</Text>
          </Card>

          <View className="mb-2">
            <Text className="mb-3 px-1 text-sm font-semibold text-surface-500">{t('menu.quick')}</Text>
            <Card className="p-1">
              {quickLinks.map((item, index) => {
                const Icon = item.icon;
                return (
                  <TouchableOpacity
                    key={item.key}
                    className={`mx-1 rounded-2xl px-3 py-3 ${index < quickLinks.length - 1 ? 'mb-1 border-b border-surface-100' : ''}`}
                    activeOpacity={0.88}
                    onPress={() => router.push(item.path as never)}
                  >
                    <View className="flex-row items-center">
                      <View className="h-11 w-11 items-center justify-center rounded-xl bg-surface-100">
                        <Icon size={18} color="#0f172a" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-surface-900">{item.label}</Text>
                        <Text className="mt-0.5 text-xs text-surface-500">{item.description}</Text>
                      </View>
                      <ChevronRight size={18} color="#94a3b8" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Card>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
