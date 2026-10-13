import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { ProfileAvatar } from '../../src/features/profile/ProfileAvatar';
import { Building2, CalendarDays, ChevronRight, Clock3, Edit3, Film, GraduationCap, HelpCircle, MapPin, Settings, ShieldCheck, Star, UserPlus, Users, Waves, X } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';
import { apiClient } from '../../src/lib/api';
import { isLayoutPreviewEnabled } from '../../src/lib/layoutPreview';

type QuickTab = 'favorites' | 'feed' | 'reels' | 'resorts';

type GalleryItem = {
  id: string;
  postId: string;
  resortId?: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  accent: string;
};

const PAGE_SIZE = 15;
const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
  'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200',
  'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=1200',
  'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=1200',
  'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200',
  'https://images.unsplash.com/photo-1583212292454-3f82f0a96f4d?w=1200',
];

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

function feedRowsToGallery(rows: any[], prefix: string, fallbackLabel: string): GalleryItem[] {
  return rows.map((row, index) => {
    const media = Array.isArray(row?.media) ? row.media : [];
    const firstImage = media.find((item: any) => item?.type === 'image' && String(item.url || '').trim());
    const fallbackMedia = media.find((item: any) => String(item.url || '').trim());
    const imageUrl =
      String(firstImage?.url || fallbackMedia?.url || row?.image || '').trim() ||
      IMAGE_POOL[index % IMAGE_POOL.length] ||
      IMAGE_POOL[0];

    const postId = String(row?.id || '').trim();
    return {
      id: `${prefix}-${postId || index}`,
      postId,
      title: String(row?.location || row?.diveSite || fallbackLabel || 'Dive').trim() || fallbackLabel,
      subtitle: String(row?.content || '').trim() || fallbackLabel,
      imageUrl,
      accent: index % 2 === 0 ? '#0D5FA8' : '#0EA5A4',
    };
  });
}

function formatEducationDate(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const { data: profile } = useProfile();
  const [quickTab, setQuickTab] = useState<QuickTab>('feed');
  const [visibleByTab, setVisibleByTab] = useState<Record<QuickTab, number>>({
    favorites: PAGE_SIZE,
    feed: PAGE_SIZE,
    reels: PAGE_SIZE,
    resorts: PAGE_SIZE,
  });
  const [pagingLock, setPagingLock] = useState(false);
  const [connectionType, setConnectionType] = useState<'followers' | 'following' | null>(null);
  const [diveListOpen, setDiveListOpen] = useState(false);

  const { data: savedFeedRaw = [] } = useQuery({
    queryKey: ['profile-grid-saved', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getSavedFeed(String(user?.id || '')),
  });
  const { data: savedResortsRaw = [] } = useQuery({
    queryKey: ['profile-grid-saved-resorts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getSavedResorts(String(user?.id || '')),
  });
  const educationApplicationsQuery = useQuery({
    queryKey: ['education-applications', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getMyEducationApplications(),
  });

  const { data: ownFeedRaw = [] } = useQuery({
    queryKey: ['profile-grid-own-feed', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const uid = String(user?.id || '').trim();
      if (!uid) return [];
      let cursor: string | null = null;
      const merged: any[] = [];
      for (let i = 0; i < 12; i += 1) {
        const page = await apiClient.getFeed(cursor);
        const rows = Array.isArray(page?.data) ? page.data : [];
        merged.push(...rows.filter((row: any) => String(row?.user?.id || '') === uid));
        if (!page?.nextCursor) break;
        cursor = String(page.nextCursor);
      }
      return merged;
    },
  });

  const { data: ownReelsRaw = [] } = useQuery({
    queryKey: ['profile-grid-own-reels', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const uid = String(user?.id || '').trim();
      if (!uid) return [];
      const rows = await apiClient.getReels();
      return rows.filter((row: any) => String(row?.user?.id || '') === uid);
    },
  });
  const connectionsQuery = useQuery({
    queryKey: ['profile-connections', user?.id, connectionType],
    enabled: Boolean(user?.id && connectionType),
    queryFn: () => apiClient.getProfileConnections(String(user?.id || ''), connectionType || 'followers'),
  });

  const displayName = profile?.full_name || profile?.username || user?.name || t('profile.unnamed');
  const displayAvatar = profile?.avatar_url || user?.avatar;
  const displayHandle = profile?.username ? `@${profile.username}` : '';
  const displayBio = isLayoutPreviewEnabled() ? t('profile.previewBio') : (profile?.bio || t('profile.noBio'));
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
  const completionChecks = useMemo(
    () => [
      { key: 'avatar', label: t('profile.completion.checks.avatar'), done: Boolean(displayAvatar) },
      { key: 'bio', label: t('profile.completion.checks.bio'), done: Boolean(profile?.bio) },
      { key: 'location', label: t('profile.completion.checks.location'), done: Boolean(profile?.location) },
      { key: 'dives', label: t('profile.completion.checks.dives'), done: Number(profile?.totalDives || 0) > 0 },
      { key: 'level', label: t('profile.completion.checks.level'), done: Boolean(scubaLevelLabel || freedivingLevelLabel || diveLevelLabel) },
    ],
    [diveLevelLabel, displayAvatar, freedivingLevelLabel, profile?.bio, profile?.location, profile?.totalDives, scubaLevelLabel, t]
  );

  const showCompletionTooltip = () => {
    const lines = completionChecks.map((item) => `${item.done ? '✓' : '○'} ${item.label}`).join('\n');
    Alert.alert(
      t('profile.completion.helpTitle'),
      `${t('profile.completion.helpSubtitle')}\n\n${lines}`
    );
  };

  const favoritesCatalog = useMemo(() => {
    return feedRowsToGallery(savedFeedRaw, 'fav', t('profile.quick.tabs.favorites'));
  }, [savedFeedRaw, t]);

  const feedCatalog = useMemo(() => {
    const feedRows = ownFeedRaw.filter((row: any) => row?.publishToFeed !== false);
    return feedRowsToGallery(feedRows, 'feed', t('tabs.feed'));
  }, [ownFeedRaw, t]);

  const reelsCatalog = useMemo(() => {
    const mergedRows = [...ownReelsRaw, ...ownFeedRaw.filter((row: any) => row?.publishToReels === true)];
    const seen = new Set<string>();
    const reelRows = mergedRows.filter((row: any) => {
      const id = String(row?.id || '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return feedRowsToGallery(reelRows, 'reel', t('tabs.reels'));
  }, [ownFeedRaw, ownReelsRaw, t]);

  const resortsCatalog = useMemo<GalleryItem[]>(() => {
    return savedResortsRaw.map((resort: any, index: number) => ({
      id: `resort-${String(resort.id || index)}`,
      postId: '',
      resortId: String(resort.id || ''),
      title: String(resort.name || 'Diving Resort'),
      subtitle: String(resort.area || resort.country || t('profileQuick.savedResort')),
      imageUrl: String(resort.coverUrl || IMAGE_POOL[index % IMAGE_POOL.length]),
      accent: '#0EA5A4',
    }));
  }, [savedResortsRaw, t]);

  const tabCatalogMap: Record<QuickTab, GalleryItem[]> = {
    favorites: favoritesCatalog,
    feed: feedCatalog,
    reels: reelsCatalog,
    resorts: resortsCatalog,
  };

  const quickTabMeta = [
    { key: 'feed' as const, label: t('profile.quick.tabs.feed'), icon: Waves },
    { key: 'reels' as const, label: t('profile.quick.tabs.reels'), icon: Film },
    { key: 'resorts' as const, label: t('tabs.resorts'), icon: Building2 },
    { key: 'favorites' as const, label: t('profile.quick.tabs.favorites'), icon: Star },
  ];

  const activeCatalog = tabCatalogMap[quickTab];
  const visibleCount = visibleByTab[quickTab] || PAGE_SIZE;
  const visibleItems = activeCatalog.slice(0, visibleCount);
  const hasMore = visibleCount < activeCatalog.length;

  const loadMoreForActiveTab = () => {
    if (!hasMore || pagingLock) return;
    setPagingLock(true);
    setVisibleByTab((prev) => ({
      ...prev,
      [quickTab]: Math.min((prev[quickTab] || PAGE_SIZE) + PAGE_SIZE, activeCatalog.length),
    }));
    setTimeout(() => setPagingLock(false), 220);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 140;
    if (nearBottom) loadMoreForActiveTab();
  };

  const palette = useMemo(
    () =>
      isDark
        ? {
            cardBg: '#0f1b2a',
            softBg: '#162436',
            border: '#243447',
            borderSoft: '#2d4155',
            title: '#e2e8f0',
            text: '#c7d4e1',
            textMuted: '#8ea4ba',
            icon: '#b8cada',
          }
        : {
            cardBg: '#ffffff',
            softBg: '#f8fbff',
            border: '#dce8f4',
            borderSoft: '#e3edf7',
            title: '#0f172a',
            text: '#324b64',
            textMuted: '#64748b',
            icon: '#47627c',
          },
    [isDark]
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: palette.title }]}>{t('tabs.profile')}</Text>
            <Text style={[styles.pageSubtitle, { color: palette.textMuted }]}>{t('profile.summary')}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.push(appRouteMap.settings.path as never)}
            style={[styles.headerIconButton, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
          >
            <Settings size={18} color={palette.icon} />
          </TouchableOpacity>
        </View>

        <View style={[styles.profileCard, { borderColor: palette.border, backgroundColor: palette.cardBg }]}>
          <View style={styles.badgeRow}>
            <View style={[styles.memberBadge, { borderColor: palette.border, backgroundColor: palette.softBg }]}>
              <ShieldCheck size={13} color={isDark ? '#7dd3fc' : '#1d4f7a'} />
              <Text style={[styles.memberBadgeText, { color: isDark ? '#c7d4e1' : '#2a5479' }]}>{t('profile.memberBadge', { defaultValue: 'Divergram Member' })}</Text>
            </View>
          </View>

          <View style={styles.identityRow}>
            {displayAvatar ? (
              <ProfileAvatar user={{ name: displayName, avatar: displayAvatar }} size="large" className="border border-surface-200 dark:border-[#2d4155]" />
            ) : (
              <View style={[styles.logoFallback, { borderColor: palette.border, backgroundColor: palette.softBg }]}>
                <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
              </View>
            )}

            <View style={styles.identityTextWrap}>
              <Text style={[styles.displayName, { color: palette.title }]}>{displayName}</Text>
              {displayHandle ? <Text style={[styles.displayHandle, { color: palette.textMuted }]}>{displayHandle}</Text> : null}
              {displayLocation ? (
                <View style={styles.locationRow}>
                  <MapPin size={13} color={palette.textMuted} />
                  <Text style={[styles.locationText, { color: palette.textMuted }]}>{displayLocation}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {scubaLevelLabel || freedivingLevelLabel || diveLevelLabel ? (
            <View style={styles.levelRow}>
              {scubaLevelLabel ? (
                <View style={[styles.levelPill, { borderColor: palette.borderSoft, backgroundColor: palette.softBg }]}>
                  <Text style={[styles.levelPillText, { color: isDark ? '#b9d8f4' : '#29547b' }]}>{t('logsForm.diveTypes.scuba', { defaultValue: 'Scuba' })} · {scubaLevelLabel}</Text>
                </View>
              ) : null}
              {freedivingLevelLabel ? (
                <View style={[styles.levelPill, { borderColor: palette.borderSoft, backgroundColor: palette.softBg }]}>
                  <Text style={[styles.levelPillText, { color: isDark ? '#b9d8f4' : '#29547b' }]}>
                    {t('logsForm.diveTypes.freediving', { defaultValue: 'Freediving' })} · {freedivingLevelLabel}
                  </Text>
                </View>
              ) : null}
              {!scubaLevelLabel && !freedivingLevelLabel && diveLevelLabel ? (
                <View style={[styles.levelPill, { borderColor: palette.borderSoft, backgroundColor: palette.softBg }]}>
                  <Text style={[styles.levelPillText, { color: isDark ? '#b9d8f4' : '#29547b' }]}>{diveLevelLabel}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.bioWrap, { borderColor: palette.borderSoft, backgroundColor: palette.softBg }]}>
            <Text style={[styles.bioText, { color: palette.text }]}>{displayBio}</Text>
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
          </View>
        </View>

        <Card className="mb-5 p-0">
          <View style={styles.compactStatsRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setDiveListOpen(true)}
              style={[styles.compactStatItem, { borderRightColor: palette.border }]}
            >
              <Waves size={15} color="#0d5fa8" />
              <Text style={[styles.compactStatValue, { color: palette.title }]}>{Number(profile?.totalDives || 0)}</Text>
              <Text style={[styles.compactStatLabel, { color: palette.textMuted }]}>{t('profile.stats.totalDives')}</Text>
            </TouchableOpacity>
            <View style={[styles.compactStatItem, { borderRightColor: palette.border }]}>
              <Clock3 size={15} color="#0d5fa8" />
              <Text style={[styles.compactStatValue, { color: palette.title }]}>{Number(profile?.totalTime || 0)}h</Text>
              <Text style={[styles.compactStatLabel, { color: palette.textMuted }]}>{t('profile.stats.totalTime')}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setConnectionType('following')}
              style={[styles.compactStatItem, { borderRightColor: palette.border }]}
            >
              <UserPlus size={15} color="#0d5fa8" />
              <Text style={[styles.compactStatValue, { color: palette.title }]}>{Number(profile?.followingCount || 0)}</Text>
              <Text style={[styles.compactStatLabel, { color: palette.textMuted }]}>{t('profile.connections.following')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setConnectionType('followers')}
              style={[styles.compactStatItem, styles.compactStatItemLast]}
            >
              <Users size={15} color="#0d5fa8" />
              <Text style={[styles.compactStatValue, { color: palette.title }]}>{Number(profile?.followerCount || 0)}</Text>
              <Text style={[styles.compactStatLabel, { color: palette.textMuted }]}>{t('profile.connections.followers')}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card className="mb-4 p-5">
          <View style={styles.completionHeadRow}>
            <View style={styles.completionTitleRow}>
              <Text style={[styles.sectionLabel, { color: palette.title }]}>{t('profile.completion.title')}</Text>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={showCompletionTooltip}
                style={[styles.completionHelpButton, { borderColor: palette.border, backgroundColor: palette.softBg }]}
              >
                <HelpCircle size={15} color={palette.icon} />
              </TouchableOpacity>
            </View>
            <View style={[styles.completionPill, { backgroundColor: isDark ? '#1a2f45' : '#eaf3ff' }]}>
              <Text style={styles.completionPillText}>{completion}%</Text>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <View style={[styles.progressFill, { width: `${completion}%`, backgroundColor: completionColor }]} />
          </View>
          <Text style={[styles.completionText, { color: palette.textMuted }]}>{t('profile.completion.subtitle', { percent: completion })}</Text>
        </Card>

        <View style={[styles.educationCard, { borderColor: palette.border, backgroundColor: palette.cardBg }]}>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push(appRouteMap.dive_education.path as never)}
            style={styles.educationHeader}
          >
            <View style={styles.educationTitleRow}>
              <View style={[styles.educationIcon, { backgroundColor: isDark ? '#123650' : '#e7f6ff' }]}>
                <GraduationCap size={20} color="#0d75bd" />
              </View>
              <View>
                <Text style={[styles.educationTitle, { color: palette.title }]}>{t('profile.education.title')}</Text>
                <Text style={[styles.educationSubtitle, { color: palette.textMuted }]}>{t('profile.education.subtitle')}</Text>
              </View>
            </View>
            <View style={styles.educationHeaderAction}>
              <Text style={styles.educationHeaderActionText}>{t('profile.education.viewAll')}</Text>
              <ChevronRight size={16} color="#0d75bd" />
            </View>
          </TouchableOpacity>

          {educationApplicationsQuery.isLoading ? (
            <View style={styles.educationLoading}>
              <ActivityIndicator color="#0d75bd" />
            </View>
          ) : educationApplicationsQuery.data?.length ? (
            <View style={styles.educationList}>
              {educationApplicationsQuery.data.slice(0, 3).map((application) => {
                const statusLabel = t(`diveEducation.status.${application.status}` as any, { defaultValue: application.status });
                const preferredDate = String(application.preferredDate || application.preferredSchedule || '').trim();
                return (
                  <TouchableOpacity
                    key={application.id}
                    activeOpacity={0.84}
                    onPress={() => router.push(appRouteMap.dive_education.path as never)}
                    style={[styles.educationRow, { borderColor: palette.border, backgroundColor: palette.softBg }]}
                  >
                    <View style={styles.educationRowBody}>
                      <View style={styles.educationCourseLine}>
                        <Text numberOfLines={1} style={[styles.educationCourseTitle, { color: palette.title }]}>{application.courseTitle}</Text>
                        <View style={[styles.educationStatus, application.status === 'cancelled' ? styles.educationStatusCancelled : undefined]}>
                          <Text style={[styles.educationStatusText, application.status === 'cancelled' ? styles.educationStatusTextCancelled : undefined]}>{statusLabel}</Text>
                        </View>
                      </View>
                      <Text numberOfLines={1} style={[styles.educationAssignment, { color: palette.textMuted }]}>
                        {application.assignedResortName || application.assignedInstructorName || t('diveEducation.assignmentPending')}
                      </Text>
                      {preferredDate ? (
                        <View style={styles.educationDateRow}>
                          <CalendarDays size={13} color={palette.icon} />
                          <Text style={[styles.educationDateText, { color: palette.textMuted }]}>{formatEducationDate(preferredDate)}</Text>
                        </View>
                      ) : null}
                    </View>
                    <ChevronRight size={18} color={palette.icon} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => router.push(appRouteMap.dive_education.path as never)}
              style={[styles.educationEmpty, { borderColor: palette.border, backgroundColor: palette.softBg }]}
            >
              <Text style={[styles.educationEmptyText, { color: palette.textMuted }]}>{t('profileExtra.educationEmpty')}</Text>
              <Text style={styles.educationEmptyAction}>{t('profileExtra.educationBrowse')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.quickSectionWrap}>
          <Text style={[styles.quickSectionTitle, { color: palette.textMuted }]}>{t('tabs.activity')}</Text>
          <View style={styles.quickTabsRow}>
            {quickTabMeta.map((tab, index) => {
              const Icon = tab.icon;
              const active = quickTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.86}
                  onPress={() => setQuickTab(tab.key)}
                  style={[
                    styles.quickTabChip,
                    { borderColor: palette.border, backgroundColor: palette.softBg },
                    active ? styles.quickTabChipActive : undefined,
                    index === quickTabMeta.length - 1 ? styles.quickTabChipLast : undefined,
                  ]}
                >
                  <Icon size={14} color={active ? '#fff' : palette.icon} />
                  <Text style={[styles.quickTabChipText, { color: palette.icon }, active ? styles.quickTabChipTextActive : undefined]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.gridWrap}>
            {visibleItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                onPress={() => {
                  if (item.resortId) {
                    router.push(`${appRouteMap.resort_detail.path}?resortId=${encodeURIComponent(item.resortId)}` as never);
                    return;
                  }
                  if (!item.postId) return;
                  router.push(`${appRouteMap.post.path}?post=${encodeURIComponent(item.postId)}` as never);
                }}
                style={[styles.gridItem, index % 3 === 2 ? styles.gridItemLastInRow : undefined]}
              >
                <View style={[styles.gridImageWrap, { borderColor: palette.border, backgroundColor: palette.softBg }]}>
                  <Image source={{ uri: item.imageUrl }} resizeMode="cover" style={styles.gridImage} />
                </View>
                <View style={styles.gridMetaWrap}>
                  <Text numberOfLines={1} style={[styles.gridTitle, { color: palette.title }]}>{item.title}</Text>
                  <Text numberOfLines={1} style={[styles.gridSubtitle, { color: palette.textMuted }]}>{item.subtitle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {!visibleItems.length ? (
            <View style={[styles.emptyGridCard, { borderColor: palette.border, backgroundColor: palette.softBg }]}>
              <Text style={[styles.emptyGridTitle, { color: palette.title }]}>
                {quickTab === 'favorites'
                  ? t('profile.quick.empty.favorites')
                  : quickTab === 'resorts'
                    ? t('resorts.savedEmpty')
                  : quickTab === 'reels'
                    ? t('profile.quick.empty.reels')
                    : t('profile.quick.empty.feed')}
              </Text>
            </View>
          ) : null}

          {hasMore ? (
            <View style={styles.pagingHintWrap}>
              <Text style={[styles.pagingHintText, { color: palette.textMuted }]}>{t('profileExtra.pagingMore')}</Text>
            </View>
          ) : visibleItems.length ? (
            <View style={styles.pagingHintWrap}>
              <Text style={[styles.pagingDoneText, { color: isDark ? '#7f93aa' : '#94a3b8' }]}>{t('profileExtra.pagingDone')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal transparent visible={diveListOpen} animationType="slide" onRequestClose={() => setDiveListOpen(false)}>
        <Pressable style={styles.connectionModalBackdrop} onPress={() => setDiveListOpen(false)}>
          <Pressable style={[styles.connectionSheet, { backgroundColor: palette.cardBg }]} onPress={() => undefined}>
            <View style={[styles.connectionSheetHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.connectionSheetTitle, { color: palette.title }]}>{t('profileExtra.dives')}</Text>
              <TouchableOpacity onPress={() => setDiveListOpen(false)} style={styles.connectionCloseButton}>
                <X size={22} color={palette.title} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ownFeedRaw}
              keyExtractor={(item: any, index) => String(item?.id || `dive-${index}`)}
              contentContainerStyle={styles.connectionList}
              ListEmptyComponent={
                <View style={styles.connectionEmpty}>
                  <Waves size={36} color={palette.textMuted} />
                  <Text style={[styles.connectionEmptyTitle, { color: palette.title }]}>{t('profileExtra.emptyDives')}</Text>
                </View>
              }
              renderItem={({ item, index }: { item: any; index: number }) => {
                const gallery = feedRowsToGallery([item], `dive-${index}`, t('publicProfile.diveRecord'))[0];
                const detail = [
                  item?.max_depth ? t('publicProfile.maxDepth', { depth: item.max_depth }) : '',
                  item?.dive_duration ? t('publicProfile.durationMinutes', { minutes: item.dive_duration }) : '',
                  item?.created_at ? new Date(item.created_at).toLocaleDateString('ko-KR') : '',
                ].filter(Boolean).join(' · ');
                return (
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => {
                      setDiveListOpen(false);
                      router.push(`${appRouteMap.post.path}?post=${encodeURIComponent(String(item.id))}` as never);
                    }}
                    style={[styles.diveListRow, { borderBottomColor: palette.border }]}
                  >
                    {gallery?.imageUrl ? (
                      <Image source={{ uri: gallery.imageUrl }} style={styles.diveListImage} />
                    ) : (
                      <View style={[styles.diveListImageFallback, { backgroundColor: palette.softBg }]}>
                        <Waves size={24} color="#0d5fa8" />
                      </View>
                    )}
                    <View style={styles.diveListBody}>
                      <Text numberOfLines={1} style={[styles.diveListTitle, { color: palette.title }]}>
                        {String(item?.dive_site || item?.location || gallery?.title || t('publicProfile.diveRecord'))}
                      </Text>
                      <Text numberOfLines={1} style={[styles.diveListDetail, { color: palette.textMuted }]}>
                        {detail || t('publicProfile.diveRecord')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={Boolean(connectionType)}
        animationType="slide"
        onRequestClose={() => setConnectionType(null)}
      >
        <Pressable style={styles.connectionModalBackdrop} onPress={() => setConnectionType(null)}>
          <Pressable style={[styles.connectionSheet, { backgroundColor: palette.cardBg }]} onPress={() => undefined}>
            <View style={[styles.connectionSheetHeader, { borderBottomColor: palette.border }]}>
              <Text style={[styles.connectionSheetTitle, { color: palette.title }]}>
                {connectionType === 'following' ? t('profile.connections.following') : t('profile.connections.followers')}
              </Text>
              <TouchableOpacity onPress={() => setConnectionType(null)} style={styles.connectionCloseButton}>
                <X size={22} color={palette.title} />
              </TouchableOpacity>
            </View>

            {connectionsQuery.isLoading ? (
              <View style={styles.connectionLoading}>
                <ActivityIndicator color="#0d5fa8" />
              </View>
            ) : (
              <FlatList
                data={connectionsQuery.data || []}
                keyExtractor={(item: any) => String(item.id)}
                contentContainerStyle={styles.connectionList}
                ListEmptyComponent={
                  <View style={styles.connectionEmpty}>
                    <Users size={34} color={palette.textMuted} />
                    <Text style={[styles.connectionEmptyTitle, { color: palette.title }]}>
                      {connectionType === 'following' ? t('profileExtra.emptyFollowing') : t('profileExtra.emptyFollowers')}
                    </Text>
                  </View>
                }
                renderItem={({ item }: { item: any }) => {
                  const name = String(item.full_name || item.username || 'Diver');
                  return (
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() => {
                        setConnectionType(null);
                        router.push(`${appRouteMap.account.path}?userId=${encodeURIComponent(String(item.id))}` as never);
                      }}
                      style={[styles.connectionRow, { borderBottomColor: palette.border }]}
                    >
                      {item.avatar_url ? (
                        <Image source={{ uri: String(item.avatar_url) }} style={styles.connectionAvatar} />
                      ) : (
                        <View style={styles.connectionAvatarFallback}>
                          <Text style={styles.connectionAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={styles.connectionBody}>
                        <Text numberOfLines={1} style={[styles.connectionName, { color: palette.title }]}>{name}</Text>
                        <Text numberOfLines={1} style={[styles.connectionHandle, { color: palette.textMuted }]}>@{item.username || 'diver'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  educationCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 22,
  },
  educationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  educationTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  educationIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  educationTitle: { fontSize: 16, fontWeight: '900' },
  educationSubtitle: { marginTop: 3, fontSize: 11, lineHeight: 15 },
  educationHeaderAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  educationHeaderActionText: { color: '#0d75bd', fontSize: 11, fontWeight: '800' },
  educationLoading: { minHeight: 86, alignItems: 'center', justifyContent: 'center' },
  educationList: { marginTop: 14, gap: 8 },
  educationRow: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  educationRowBody: { flex: 1 },
  educationCourseLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  educationCourseTitle: { flex: 1, fontSize: 13, fontWeight: '900' },
  educationStatus: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#dff4ff' },
  educationStatusCancelled: { backgroundColor: '#feecec' },
  educationStatusText: { color: '#0874b5', fontSize: 10, fontWeight: '900' },
  educationStatusTextCancelled: { color: '#c24141' },
  educationAssignment: { marginTop: 5, fontSize: 11 },
  educationDateRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 5 },
  educationDateText: { fontSize: 10, fontWeight: '700' },
  educationEmpty: { marginTop: 14, minHeight: 76, borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  educationEmptyText: { fontSize: 12 },
  educationEmptyAction: { marginTop: 6, color: '#0d75bd', fontSize: 12, fontWeight: '900' },
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
  },
  profileActionButtonPrimary: {
    borderColor: '#0d5fa8',
    backgroundColor: '#0d5fa8',
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
  completionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionHelpButton: {
    marginLeft: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#d5e3f1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fbff',
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
  quickTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickTabChip: {
    flex: 1,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#dbe8f4',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    flexDirection: 'row',
  },
  quickTabChipLast: {
    marginRight: 0,
  },
  quickTabChipActive: {
    borderColor: '#0d5fa8',
    backgroundColor: '#0d5fa8',
  },
  quickTabChipText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
    color: '#47627c',
  },
  quickTabChipTextActive: {
    color: '#ffffff',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '33.333%',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  gridItemLastInRow: {
    paddingRight: 0,
  },
  gridImageWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce8f4',
    overflow: 'hidden',
    backgroundColor: '#eaf3ff',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
  },
  gridMetaWrap: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  gridTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  gridSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: '#64748b',
  },
  pagingHintWrap: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  pagingHintText: {
    fontSize: 11,
    color: '#64748b',
  },
  pagingDoneText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  compactStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStatItem: {
    flex: 1,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  compactStatItemLast: {
    borderRightWidth: 0,
  },
  compactStatValue: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: '800',
  },
  compactStatLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  connectionModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 12, 24, 0.52)',
  },
  connectionSheet: {
    minHeight: '60%',
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  connectionSheetHeader: {
    height: 64,
    paddingLeft: 22,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  connectionSheetTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  connectionCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionLoading: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionList: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  connectionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  connectionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  connectionAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0f2fe',
  },
  connectionAvatarText: {
    color: '#0d5fa8',
    fontSize: 17,
    fontWeight: '900',
  },
  connectionBody: {
    flex: 1,
    marginLeft: 12,
  },
  connectionName: {
    fontSize: 14,
    fontWeight: '800',
  },
  connectionHandle: {
    marginTop: 3,
    fontSize: 11,
  },
  connectionEmpty: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  connectionEmptyTitle: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  diveListRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  diveListImage: {
    width: 62,
    height: 62,
    borderRadius: 10,
  },
  diveListImageFallback: {
    width: 62,
    height: 62,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diveListBody: {
    flex: 1,
    marginLeft: 12,
  },
  diveListTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  diveListDetail: {
    marginTop: 5,
    fontSize: 11,
  },
  emptyGridCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dce8f4',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyGridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
});
