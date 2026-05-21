import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { ProfileStats } from '../../src/features/profile/ProfileStats';
import { ProfileAvatar } from '../../src/features/profile/ProfileAvatar';
import { Activity, ChevronRight, Edit3, MapPin, Settings, ShieldCheck, Star } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';

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
  const diveLevelLabel = diveLevelKey ? t(`profile.diveLevels.${diveLevelKey}` as any, { defaultValue: diveLevelKey }) : '';

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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>{t('tabs.profile', { defaultValue: '프로필' })}</Text>
            <Text style={styles.pageSubtitle}>{t('profile.summary', { defaultValue: '다이빙 활동과 계정 정보를 관리하세요.' })}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.push(appRouteMap.settings.path as never)}
            style={styles.headerIconButton}
          >
            <Settings size={18} color="#2b4a67" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.badgeRow}>
            <View style={styles.memberBadge}>
              <ShieldCheck size={13} color="#1d4f7a" />
              <Text style={styles.memberBadgeText}>{t('profile.memberBadge', { defaultValue: 'Divergram Member' })}</Text>
            </View>
          </View>

          <View style={styles.identityRow}>
            {displayAvatar ? (
              <ProfileAvatar user={{ name: displayName, avatar: displayAvatar }} size="large" className="border border-surface-200" />
            ) : (
              <View style={styles.logoFallback}>
                <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
              </View>
            )}

            <View style={styles.identityTextWrap}>
              <Text style={styles.displayName}>{displayName}</Text>
              {displayHandle ? <Text style={styles.displayHandle}>{displayHandle}</Text> : null}
              {displayLocation ? (
                <View style={styles.locationRow}>
                  <MapPin size={13} color="#5f7f9d" />
                  <Text style={styles.locationText}>{displayLocation}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {scubaLevelLabel || freedivingLevelLabel || diveLevelLabel ? (
            <View style={styles.levelRow}>
              {scubaLevelLabel ? (
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>{t('logsForm.diveTypes.scuba', { defaultValue: 'Scuba' })} · {scubaLevelLabel}</Text>
                </View>
              ) : null}
              {freedivingLevelLabel ? (
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>
                    {t('logsForm.diveTypes.freediving', { defaultValue: 'Freediving' })} · {freedivingLevelLabel}
                  </Text>
                </View>
              ) : null}
              {!scubaLevelLabel && !freedivingLevelLabel && diveLevelLabel ? (
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>{diveLevelLabel}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.bioWrap}>
            <Text style={styles.bioText}>{displayBio}</Text>
          </View>

          <View style={styles.profileActionsRow}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push(appRouteMap.profile_edit.path as never)}
              style={[styles.profileActionButton, styles.profileActionButtonPrimary]}
            >
              <Edit3 size={14} color="#ffffff" />
              <Text style={styles.profileActionPrimaryText}>{t('profile.edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => router.push(appRouteMap.account.path as never)}
              style={styles.profileActionButton}
            >
              <Text style={styles.profileActionText}>{t('tabs.account')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ProfileStats profile={profile} loading={isLoading} />

        <Card className="mb-4 p-5">
          <View style={styles.completionHeadRow}>
            <Text style={styles.sectionLabel}>{t('profile.completion.title')}</Text>
            <View style={styles.completionPill}>
              <Text style={styles.completionPillText}>{completion}%</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion}%`, backgroundColor: completionColor }]} />
          </View>
          <Text style={styles.completionText}>{t('profile.completion.subtitle', { percent: completion })}</Text>
        </Card>

        <View style={styles.quickSectionWrap}>
          <Text style={styles.quickSectionTitle}>{t('menu.quick')}</Text>
          <Card className="p-1">
            {quickLinks.map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.86}
                  onPress={() => router.push(item.path as never)}
                  style={[styles.quickRow, index < quickLinks.length - 1 ? styles.quickRowBorder : undefined]}
                >
                  <View style={styles.quickIconWrap}>
                    <Icon size={17} color="#1f3c58" />
                  </View>
                  <View style={styles.quickTextWrap}>
                    <Text style={styles.quickRowTitle}>{item.label}</Text>
                    <Text style={styles.quickRowDesc}>{item.description}</Text>
                  </View>
                  <ChevronRight size={18} color="#8ca0b5" />
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pageTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: '#0f172a',
  },
  pageSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b',
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce8f4',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#dce8f4',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dce8f4',
    backgroundColor: '#f6faff',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  memberBadgeText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '700',
    color: '#2a5479',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#dce8f4',
    backgroundColor: '#f7fbff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 45,
    height: 45,
  },
  identityTextWrap: {
    marginLeft: 14,
    flex: 1,
  },
  displayName: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  displayHandle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6b8298',
  },
  locationRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#5f7f9d',
    fontWeight: '600',
  },
  levelRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  levelPill: {
    marginRight: 6,
    marginBottom: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe8f4',
    backgroundColor: '#f6faff',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#29547b',
  },
  bioWrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e3edf7',
    backgroundColor: '#f9fcff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#324b64',
  },
  profileActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  profileActionButton: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d8e6f3',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginLeft: 6,
  },
  profileActionButtonPrimary: {
    marginLeft: 0,
    marginRight: 6,
    borderColor: '#0d5fa8',
    backgroundColor: '#0d5fa8',
  },
  profileActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#355470',
  },
  profileActionPrimaryText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  completionHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  completionPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#eaf3ff',
  },
  completionPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0d5fa8',
  },
  progressTrack: {
    marginTop: 10,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: 7,
    borderRadius: 999,
  },
  completionText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
  },
  quickSectionWrap: {
    marginTop: 2,
  },
  quickSectionTitle: {
    marginBottom: 10,
    marginLeft: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  quickRow: {
    marginHorizontal: 4,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  quickRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e7eef5',
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dce8f4',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  quickRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  quickRowDesc: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
});
