import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { Card } from '../../src/components/Card';
import { useAuth } from '../../src/hooks/useAuth';
import { useProfile } from '../../src/hooks/useProfile';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { ProfileStats } from '../../src/features/profile/ProfileStats';
import { ProfileAvatar } from '../../src/features/profile/ProfileAvatar';
import { Edit3, Film, HelpCircle, MapPin, Settings, ShieldCheck, Star, Waves } from 'lucide-react-native';
import { appRouteMap } from '../../src/config/sitemap';
import { apiClient } from '../../src/lib/api';

type QuickTab = 'favorites' | 'feed' | 'reels';

type GalleryItem = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  accent: string;
};

const PAGE_SIZE = 15;
const MIN_CATALOG_SIZE = 45;
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

    return {
      id: `${prefix}-${String(row?.id || index)}`,
      title: String(row?.location || row?.diveSite || fallbackLabel || 'Dive').trim() || fallbackLabel,
      subtitle: String(row?.content || '').trim() || fallbackLabel,
      imageUrl,
      accent: index % 2 === 0 ? '#0D5FA8' : '#0EA5A4',
    };
  });
}

function ensureMinCatalog(items: GalleryItem[], prefix: string, label: string): GalleryItem[] {
  if (items.length >= MIN_CATALOG_SIZE) return items;
  const source = items.length ? items : [{
    id: `${prefix}-seed`,
    title: label,
    subtitle: label,
    imageUrl: IMAGE_POOL[0],
    accent: '#0D5FA8',
  }];

  const out = [...items];
  let cursor = 0;
  while (out.length < MIN_CATALOG_SIZE) {
    const base = source[cursor % source.length];
    out.push({
      ...base,
      id: `${base.id}-dup-${out.length}`,
      title: `${base.title}`,
      imageUrl: IMAGE_POOL[out.length % IMAGE_POOL.length] || base.imageUrl,
    });
    cursor += 1;
  }
  return out;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const { data: profile, isLoading } = useProfile();
  const [quickTab, setQuickTab] = useState<QuickTab>('favorites');
  const [visibleByTab, setVisibleByTab] = useState<Record<QuickTab, number>>({
    favorites: PAGE_SIZE,
    feed: PAGE_SIZE,
    reels: PAGE_SIZE,
  });
  const [pagingLock, setPagingLock] = useState(false);

  const { data: savedFeedRaw = [] } = useQuery({
    queryKey: ['profile-grid-saved', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => apiClient.getSavedFeed(String(user?.id || '')),
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
  const completionChecks = useMemo(
    () => [
      { key: 'avatar', label: t('profile.completion.checks.avatar', { defaultValue: '프로필 사진 등록' }), done: Boolean(displayAvatar) },
      { key: 'bio', label: t('profile.completion.checks.bio', { defaultValue: '자기소개 입력' }), done: Boolean(profile?.bio) },
      { key: 'location', label: t('profile.completion.checks.location', { defaultValue: '활동 지역 설정' }), done: Boolean(profile?.location) },
      { key: 'dives', label: t('profile.completion.checks.dives', { defaultValue: '다이빙 로그 1개 이상' }), done: Number(profile?.totalDives || 0) > 0 },
      { key: 'level', label: t('profile.completion.checks.level', { defaultValue: '다이빙 레벨/자격 설정' }), done: Boolean(scubaLevelLabel || freedivingLevelLabel || diveLevelLabel) },
    ],
    [diveLevelLabel, displayAvatar, freedivingLevelLabel, profile?.bio, profile?.location, profile?.totalDives, scubaLevelLabel, t]
  );

  const showCompletionTooltip = () => {
    const lines = completionChecks.map((item) => `${item.done ? '✓' : '○'} ${item.label}`).join('\n');
    Alert.alert(
      t('profile.completion.helpTitle', { defaultValue: '완성도 체크 항목' }),
      `${t('profile.completion.helpSubtitle', { defaultValue: '아래 항목을 채우면 완성도가 올라갑니다.' })}\n\n${lines}`
    );
  };

  const favoritesCatalog = useMemo(() => {
    const base = feedRowsToGallery(savedFeedRaw, 'fav', t('profile.quick.tabs.favorites', { defaultValue: '즐겨찾기' }));
    return ensureMinCatalog(base, 'fav', t('profile.quick.tabs.favorites', { defaultValue: '즐겨찾기' }));
  }, [savedFeedRaw, t]);

  const feedCatalog = useMemo(() => {
    const base = feedRowsToGallery(ownFeedRaw, 'feed', t('tabs.feed', { defaultValue: '피드' }));
    return ensureMinCatalog(base, 'feed', t('tabs.feed', { defaultValue: '피드' }));
  }, [ownFeedRaw, t]);

  const reelsCatalog = useMemo(() => {
    const videoRows = ownFeedRaw.filter((row: any) => Array.isArray(row?.media) && row.media.some((item: any) => item?.type === 'video'));
    const baseRows = videoRows.length ? videoRows : ownFeedRaw;
    const base = feedRowsToGallery(baseRows, 'reel', t('tabs.reels', { defaultValue: '릴스' }));
    return ensureMinCatalog(base, 'reel', t('tabs.reels', { defaultValue: '릴스' }));
  }, [ownFeedRaw, t]);

  const tabCatalogMap: Record<QuickTab, GalleryItem[]> = {
    favorites: favoritesCatalog,
    feed: feedCatalog,
    reels: reelsCatalog,
  };

  const quickTabMeta = [
    { key: 'favorites' as const, label: t('profile.quick.tabs.favorites', { defaultValue: '즐겨찾기' }), icon: Star },
    { key: 'feed' as const, label: t('profile.quick.tabs.feed', { defaultValue: '피드' }), icon: Waves },
    { key: 'reels' as const, label: t('profile.quick.tabs.reels', { defaultValue: '릴스' }), icon: Film },
  ];

  const activeCatalog = tabCatalogMap[quickTab];
  const visibleCount = visibleByTab[quickTab] || PAGE_SIZE;
  const visibleItems = activeCatalog.slice(0, visibleCount);
  const hasMore = visibleCount < activeCatalog.length;

  const loadMoreForActiveTab = useCallback(() => {
    if (!hasMore || pagingLock) return;
    setPagingLock(true);
    setVisibleByTab((prev) => ({
      ...prev,
      [quickTab]: Math.min((prev[quickTab] || PAGE_SIZE) + PAGE_SIZE, activeCatalog.length),
    }));
    setTimeout(() => setPagingLock(false), 220);
  }, [activeCatalog.length, hasMore, pagingLock, quickTab]);

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
            <Text style={[styles.pageTitle, { color: palette.title }]}>{t('tabs.profile', { defaultValue: '프로필' })}</Text>
            <Text style={[styles.pageSubtitle, { color: palette.textMuted }]}>{t('profile.summary', { defaultValue: '다이빙 활동과 계정 정보를 관리하세요.' })}</Text>
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

        <ProfileStats profile={profile} loading={isLoading} />

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

        <View style={styles.quickSectionWrap}>
          <Text style={[styles.quickSectionTitle, { color: palette.textMuted }]}>{t('tabs.activity', { defaultValue: '내 활동' })}</Text>
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

          {hasMore ? (
            <View style={styles.pagingHintWrap}>
              <Text style={[styles.pagingHintText, { color: palette.textMuted }]}>아래로 스크롤하면 다음 15개가 자동으로 로드됩니다.</Text>
            </View>
          ) : (
            <View style={styles.pagingHintWrap}>
              <Text style={[styles.pagingDoneText, { color: isDark ? '#7f93aa' : '#94a3b8' }]}>모든 항목을 표시했습니다.</Text>
            </View>
          )}
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
});
