import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Apple,
  Bell,
  Bluetooth,
  ChevronRight,
  Globe,
  HelpCircle,
  Link2,
  LogOut,
  Mail,
  MapPin,
  Settings,
  Shield,
  SunMoon,
  User,
  UserRoundCog,
} from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { KAKAO_LOGIN_ENABLED } from '../../src/config/featureFlags';
import { getSocialAuthConfig } from '../../src/config/socialAuth';
import { useAuth } from '../../src/hooks/useAuth';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useSettingsFeatureStore, type SocialProvider } from '../../src/stores/settingsFeatureStore';
import { appRouteMap } from '../../src/config/sitemap';
import { storage } from '../../src/lib/storage';
import { apiClient } from '../../src/lib/api';

const languageOptions: ('ko' | 'en' | 'ja' | 'zh')[] = ['ko', 'en', 'ja', 'zh'];
type SettingsTab = 'account' | 'notifications' | 'privacy' | 'diving' | 'app' | 'safety';
type IconComponent = React.ComponentType<{ size?: number | string; color?: any }>;
const settingsTabs: SettingsTab[] = ['account', 'notifications', 'privacy', 'diving', 'app', 'safety'];
const SETTINGS_LAST_TAB_KEY = 'divergram_settings_last_tab_v1';

type ActionRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  onPress: () => void;
  border?: boolean;
  danger?: boolean;
};

function ActionRow({ icon, title, subtitle, value, onPress, border = true, danger = false }: ActionRowProps) {
  const { isDark } = useResolvedTheme();
  const colors = isDark
    ? {
        rowBorder: '#243447',
        iconWrap: '#172534',
        iconDanger: '#3a1b23',
        title: '#e2e8f0',
        titleDanger: '#fca5a5',
        subtitle: '#94a3b8',
        chipBg: '#1e2d3f',
        chipText: '#cbd5e1',
        chevron: '#9fb3c8',
      }
    : {
        rowBorder: '#e8eff5',
        iconWrap: '#edf3f9',
        iconDanger: '#fff1f2',
        title: '#0f172a',
        titleDanger: '#ef4444',
        subtitle: '#70859a',
        chipBg: '#edf3f9',
        chipText: '#49637c',
        chevron: '#7c8a99',
      };
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.rowBase, border ? styles.rowBorder : undefined, border ? { borderBottomColor: colors.rowBorder } : undefined]}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: danger ? colors.iconDanger : colors.iconWrap }]}>{icon}</View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, { color: danger ? colors.titleDanger : colors.title }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: colors.subtitle }]}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <View style={[styles.valueChip, { backgroundColor: colors.chipBg }]}>
          <Text style={[styles.valueChipText, { color: colors.chipText }]}>{value}</Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={danger ? colors.titleDanger : colors.chevron} />
    </TouchableOpacity>
  );
}

type ToggleRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value: boolean;
  onToggle: (next: boolean) => void;
  border?: boolean;
};

function ToggleRow({ icon, title, subtitle, value, onToggle, border = true }: ToggleRowProps) {
  const { isDark } = useResolvedTheme();
  const colors = isDark
    ? {
        rowBorder: '#243447',
        iconWrap: '#172534',
        title: '#e2e8f0',
        subtitle: '#94a3b8',
        trackFalse: '#334155',
        trackTrue: '#0d5fa8',
      }
    : {
        rowBorder: '#e8eff5',
        iconWrap: '#edf3f9',
        title: '#0f172a',
        subtitle: '#70859a',
        trackFalse: '#dbe3ec',
        trackTrue: '#0d5fa8',
      };
  return (
    <View style={[styles.rowBase, border ? styles.rowBorder : undefined, border ? { borderBottomColor: colors.rowBorder } : undefined]}>
      <View style={[styles.rowIconWrap, { backgroundColor: colors.iconWrap }]}>{icon}</View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, { color: colors.title }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: colors.subtitle }]}>{subtitle}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.trackFalse, true: colors.trackTrue }} thumbColor="#ffffff" />
    </View>
  );
}

type SectionChipProps = {
  active: boolean;
  label: string;
  icon: IconComponent;
  onPress: () => void;
};

function SectionChip({ active, label, icon: Icon, onPress }: SectionChipProps) {
  const { isDark } = useResolvedTheme();
  const colors = isDark
    ? {
        bg: '#101b29',
        border: '#243447',
        activeBg: '#0d5fa8',
        activeBorder: '#0d5fa8',
        iconBg: '#1a2a3a',
        iconActiveBg: 'rgba(255,255,255,0.2)',
        label: '#b6c6d8',
        activeLabel: '#ffffff',
      }
    : {
        bg: '#f8fbff',
        border: '#dde8f2',
        activeBg: '#0d5fa8',
        activeBorder: '#0d5fa8',
        iconBg: '#e9f2fb',
        iconActiveBg: 'rgba(255,255,255,0.18)',
        label: '#45617b',
        activeLabel: '#ffffff',
      };
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[
        styles.sectionChip,
        { backgroundColor: colors.bg, borderColor: colors.border },
        active ? { backgroundColor: colors.activeBg, borderColor: colors.activeBorder } : undefined,
      ]}
    >
      <View style={[styles.sectionChipIconWrap, { backgroundColor: active ? colors.iconActiveBg : colors.iconBg }]}>
        <Icon size={16} color={active ? '#ffffff' : '#4f6275'} />
      </View>
      <Text style={[styles.sectionChipLabel, { color: active ? colors.activeLabel : colors.label }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type SocialButtonProps = {
  label: string;
  actionLabel: string;
  badge: React.ReactNode;
  onPress: () => void;
};

function SocialButton({ label, actionLabel, badge, onPress }: SocialButtonProps) {
  const { isDark } = useResolvedTheme();
  const colors = isDark
    ? {
        bg: '#0f1b2a',
        border: '#243447',
        label: '#e2e8f0',
        action: '#94a3b8',
      }
    : {
        bg: '#f8fbff',
        border: '#e1ebf4',
        label: '#12263b',
        action: '#69829a',
      };
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={[styles.socialButton, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {badge}
      <Text style={[styles.socialLabel, { color: colors.label }]}>{label}</Text>
      <Text style={[styles.socialAction, { color: colors.action }]}>{actionLabel}</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { t, i18n } = useTranslation();
  const { isDark } = useResolvedTheme();
  const { logout } = useAuth();
  const isIOS = Platform.OS === 'ios';
  const socialAuth = getSocialAuthConfig();
  const hasKakaoLogin = Boolean(KAKAO_LOGIN_ENABLED && socialAuth.kakaoRestApiKey);
  const hasInstagramLogin = Boolean(socialAuth.instagramClientId && socialAuth.instagramClientSecret);
  const socialLinks = useSettingsFeatureStore((state) => state.socialLinks);
  const syncSocialLinks = useSettingsFeatureStore((state) => state.syncSocialLinks);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  const language = useSettingsStore((state) => state.language);
  const theme = useSettingsStore((state) => state.theme);
  const pushNotifications = useSettingsStore((state) => state.pushNotifications);
  const likeNotifications = useSettingsStore((state) => state.likeNotifications);
  const commentNotifications = useSettingsStore((state) => state.commentNotifications);
  const followNotifications = useSettingsStore((state) => state.followNotifications);
  const eventNotifications = useSettingsStore((state) => state.eventNotifications);
  const profilePublic = useSettingsStore((state) => state.profilePublic);
  const postVisibility = useSettingsStore((state) => state.postVisibility);
  const diveLogVisibility = useSettingsStore((state) => state.diveLogVisibility);
  const locationSharing = useSettingsStore((state) => state.locationSharing);
  const depthUnit = useSettingsStore((state) => state.depthUnit);
  const temperatureUnit = useSettingsStore((state) => state.temperatureUnit);
  const gasPressureUnit = useSettingsStore((state) => state.gasPressureUnit);
  const emergencyShareEnabled = useSettingsStore((state) => state.emergencyShareEnabled);

  const updateLanguage = useSettingsStore((state) => state.updateLanguage);
  const updateTheme = useSettingsStore((state) => state.updateTheme);
  const updateNotificationSetting = useSettingsStore((state) => state.updateNotificationSetting);
  const updateAllNotifications = useSettingsStore((state) => state.updateAllNotifications);
  const updatePrivacySetting = useSettingsStore((state) => state.updatePrivacySetting);
  const updateSafetySetting = useSettingsStore((state) => state.updateSafetySetting);
  const updatePostVisibility = useSettingsStore((state) => state.updatePostVisibility);
  const updateDiveLogVisibility = useSettingsStore((state) => state.updateDiveLogVisibility);

  const version = Constants.expoConfig?.version || '1.1';
  const appYear = new Date().getFullYear();
  const shellColors = isDark
    ? {
        cardBg: '#0f1b2a',
        cardBorder: '#243447',
        headerBg: '#172534',
        headerBorder: '#243447',
        headerIconBg: '#213247',
        headerTitle: '#e2e8f0',
        headerSubtitle: '#9fb3c8',
        footerTitle: '#e2e8f0',
        footerValue: '#9fb3c8',
        footerCopy: '#7f93aa',
        accountDelete: '#fca5a5',
      }
    : {
        cardBg: '#ffffff',
        cardBorder: '#dbe7f2',
        headerBg: '#f4f9ff',
        headerBorder: '#e8eff5',
        headerIconBg: '#dcecff',
        headerTitle: '#0f172a',
        headerSubtitle: '#69829a',
        footerTitle: '#12263b',
        footerValue: '#64809a',
        footerCopy: '#94a3b8',
        accountDelete: '#991B1B',
      };

  const tx = (key: string, fallback: string, params?: Record<string, unknown>) =>
    t(key, { defaultValue: fallback, ...(params || {}) });
  const socialActionLabel = (provider: SocialProvider) =>
    socialLinks[provider]?.linked
      ? tx('settingsPage.account.unlinkAction', '연동끊기')
      : tx('settingsPage.account.linkAction', '연동하기');

  const tabMeta: Record<
    SettingsTab,
    {
      label: string;
      subtitle: string;
      icon: IconComponent;
    }
  > = {
    account: {
      label: tx('settingsPage.sections.account', '계정 설정'),
      subtitle: tx('settingsPage.tabSubtitles.account', '소셜 연동, 다이빙 컴퓨터, 계정 보안을 설정하세요.'),
      icon: UserRoundCog,
    },
    notifications: {
      label: tx('settingsPage.sections.notifications', '알림 설정'),
      subtitle: tx('settingsPage.tabSubtitles.notifications', '필요한 알림만 정확하게 받아보세요.'),
      icon: Bell,
    },
    privacy: {
      label: tx('settingsPage.sections.privacy', '공개 범위 설정'),
      subtitle: tx('settingsPage.tabSubtitles.privacy', '프로필, 게시물, 로그의 공개 범위를 제어하세요.'),
      icon: Shield,
    },
    diving: {
      label: tx('settingsPage.sections.diving', '다이빙 설정'),
      subtitle: tx('settingsPage.tabSubtitles.diving', '단위, 장비, 연동, 포인트 설정을 관리하세요.'),
      icon: MapPin,
    },
    app: {
      label: tx('settingsPage.sections.app', '앱 설정'),
      subtitle: tx('settingsPage.tabSubtitles.app', '언어, 테마, AI, 캐시, 하단메뉴를 관리하세요.'),
      icon: Settings,
    },
    safety: {
      label: tx('settingsPage.sections.safety', '안전 설정'),
      subtitle: tx('settingsPage.tabSubtitles.safety', '긴급 연락 및 안전 공유 옵션을 구성하세요.'),
      icon: HelpCircle,
    },
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const raw = String(params.tab || '').trim();
      if (raw && settingsTabs.includes(raw as SettingsTab)) {
        setActiveTab(raw as SettingsTab);
        return;
      }
      const saved = String(storage.getString(SETTINGS_LAST_TAB_KEY) || '').trim();
      if (saved && settingsTabs.includes(saved as SettingsTab)) {
        setActiveTab(saved as SettingsTab);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [params.tab]);

  useEffect(() => {
    storage.set(SETTINGS_LAST_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    apiClient.getOAuthLinks()
      .then((result) => {
        if (!cancelled) syncSocialLinks(result.links);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [syncSocialLinks]);

  const labelMap = {
    language: {
      ko: tx('settingsPage.languages.ko', '한국어'),
      en: tx('settingsPage.languages.en', 'English'),
      ja: tx('settingsPage.languages.ja', '日本語'),
      zh: tx('settingsPage.languages.zh', '中文'),
    },
    visibility: {
      public: tx('settingsPage.options.public', '공개'),
      followers: tx('settingsPage.options.followers', '팔로워'),
      private: tx('settingsPage.options.private', '비공개'),
    },
    depth: {
      m: tx('settingsPage.options.depthUnit.m', 'm'),
      ft: tx('settingsPage.options.depthUnit.ft', 'ft'),
    },
    temp: {
      c: tx('settingsPage.options.tempUnit.c', '℃'),
      f: tx('settingsPage.options.tempUnit.f', '℉'),
    },
    gas: {
      bar: tx('settingsPage.options.gasUnit.bar', 'bar'),
      psi: tx('settingsPage.options.gasUnit.psi', 'psi'),
    },
    theme: {
      system: tx('settingsPage.options.theme.system', '시스템'),
      dark: tx('settingsPage.options.theme.dark', '다크'),
      light: tx('settingsPage.options.theme.light', '라이트'),
    },
  };

  const setLanguage = (lng: 'ko' | 'en' | 'ja' | 'zh') => {
    updateLanguage(lng);
    if (i18n.language !== lng) i18n.changeLanguage(lng);
  };

  const pickLanguage = () => {
    Alert.alert(
      tx('settingsPage.language.title', '언어 설정'),
      tx('settingsPage.language.subtitle', '앱에서 사용할 언어를 선택하세요.'),
      [
        ...languageOptions.map((lng) => ({ text: labelMap.language[lng], onPress: () => setLanguage(lng) })),
        { text: tx('common.cancel', '취소'), style: 'cancel' as const },
      ]
    );
  };

  const pickPostVisibility = () => {
    Alert.alert(
      tx('settingsPage.privacy.postVisibility', '게시글 공개 범위'),
      tx('settingsPage.common.selectOption', '옵션을 선택하세요.'),
      [
        { text: labelMap.visibility.public, onPress: () => updatePostVisibility('public') },
        { text: labelMap.visibility.followers, onPress: () => updatePostVisibility('followers') },
        { text: labelMap.visibility.private, onPress: () => updatePostVisibility('private') },
        { text: tx('common.cancel', '취소'), style: 'cancel' as const },
      ]
    );
  };

  const pickDiveLogVisibility = () => {
    Alert.alert(
      tx('settingsPage.privacy.logVisibility', '다이빙 로그 공개 범위'),
      tx('settingsPage.common.selectOption', '옵션을 선택하세요.'),
      [
        { text: labelMap.visibility.public, onPress: () => updateDiveLogVisibility('public') },
        { text: labelMap.visibility.followers, onPress: () => updateDiveLogVisibility('followers') },
        { text: labelMap.visibility.private, onPress: () => updateDiveLogVisibility('private') },
        { text: tx('common.cancel', '취소'), style: 'cancel' as const },
      ]
    );
  };

  const pickThemeMode = () => {
    Alert.alert(
      tx('settingsPage.app.themeMode', '테마 모드'),
      tx('settingsPage.common.selectOption', '옵션을 선택하세요.'),
      [
        { text: labelMap.theme.system, onPress: () => updateTheme('system') },
        { text: labelMap.theme.dark, onPress: () => updateTheme('dark') },
        { text: labelMap.theme.light, onPress: () => updateTheme('light') },
        { text: tx('common.cancel', '취소'), style: 'cancel' as const },
      ]
    );
  };

  const clearCache = () => {
    Alert.alert(
      tx('settingsPage.app.clearCache', '캐시 삭제'),
      tx('settingsPage.app.clearCacheConfirm', '캐시를 삭제할까요?'),
      [
        { text: tx('common.cancel', '취소'), style: 'cancel' },
        {
          text: tx('common.delete', '삭제'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(tx('settingsPage.app.cacheClearedTitle', '완료'), tx('settingsPage.app.cacheClearedBody', '캐시를 정리했습니다.'));
          },
        },
      ]
    );
  };

  const handleAccountDelete = () => {
    router.push('/(tabs)/settings-detail?mode=account-delete' as never);
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    Alert.alert(t('settings.logoutTitle'), t('settings.logoutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: tx('settingsPage.logout', '로그아웃'),
        style: 'destructive',
        onPress: () => {
          setIsLoggingOut(true);
          logout();
          router.replace('/(auth)/login');
          setIsLoggingOut(false);
        },
      },
    ]);
  };

  const activeMeta = tabMeta[activeTab];
  const ActiveIcon = activeMeta.icon;

  const renderTabContent = () => {
    if (activeTab === 'account') {
      return (
        <View>
          <View style={styles.sectionTopWrap}>
            <Text style={styles.sectionTopLabel}>{tx('settingsPage.account.googleLink', '로그인 연동')}</Text>
            <View style={styles.socialRow}>
              <SocialButton
                label="Google"
                actionLabel={socialActionLabel('google')}
                onPress={() => router.push('/(tabs)/settings-detail?mode=link-google' as never)}
                badge={
                  <View style={[styles.socialBadge, { borderColor: '#c9d9ee' }]}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#2563eb' }}>G</Text>
                  </View>
                }
              />
              {isIOS ? (
                <SocialButton
                  label="Apple"
                  actionLabel={socialActionLabel('apple')}
                  onPress={() => router.push('/(tabs)/settings-detail?mode=link-apple' as never)}
                  badge={
                    <View style={[styles.socialBadge, { backgroundColor: '#111827' }]}>
                      <Apple size={16} color="#ffffff" />
                    </View>
                  }
                />
              ) : null}
              {hasKakaoLogin ? (
                <SocialButton
                  label="Kakao"
                  actionLabel={socialActionLabel('kakao')}
                  onPress={() => router.push('/(tabs)/settings-detail?mode=link-kakao' as never)}
                  badge={
                    <View style={[styles.socialBadge, { backgroundColor: '#FEE500' }]}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#191919' }}>K</Text>
                    </View>
                  }
                />
              ) : null}
              <SocialButton
                label="Naver"
                actionLabel={socialActionLabel('naver')}
                onPress={() => router.push('/(tabs)/settings-detail?mode=link-naver' as never)}
                badge={
                  <View style={[styles.socialBadge, { backgroundColor: '#00c73c' }]}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#ffffff' }}>N</Text>
                  </View>
                }
              />
              {hasInstagramLogin ? (
                <SocialButton
                  label="Instagram"
                  actionLabel={socialActionLabel('instagram')}
                  onPress={() => router.push('/(tabs)/settings-detail?mode=link-instagram' as never)}
                  badge={
                    <View style={[styles.socialBadge, { backgroundColor: '#F09433' }]}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#ffffff' }}>IG</Text>
                    </View>
                  }
                />
              ) : null}
            </View>
          </View>
          <ActionRow
            icon={<User size={18} color="#4d5d6b" />}
            title={tx('settingsPage.profile.title', '프로필 설정')}
            subtitle={tx('settingsPage.profile.subtitle', '프로필 이미지, 닉네임, 소개, 연락처 정보를 편집합니다.')}
            onPress={() => router.push(appRouteMap.profile_edit.path as never)}
          />
          <ActionRow
            icon={<Link2 size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.integration', '외부 서비스 연동')}
            subtitle={tx('settingsPage.diving.integrationSubtitle', 'Google Maps, Stormglass, Garmin, Suunto, Shearwater 상태를 관리합니다.')}
            onPress={() => router.push(appRouteMap.integration_settings.path as never)}
          />
          <ActionRow
            icon={<MapPin size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.diveLogManagement', 'DiveLog 관리')}
            subtitle={tx('settingsPage.diving.diveLogManagementSubtitle', '동기화 로그, 실패 기록, 편집 대기 로그를 관리합니다.')}
            onPress={() => router.push(appRouteMap.dive_log_management.path as never)}
          />
          <ActionRow
            icon={<Bluetooth size={18} color="#4d5d6b" />}
            title={tx('settingsPage.account.devices', '다이빙 컴퓨터 관리')}
            subtitle={tx('settingsPage.account.devicesSubtitle', '가민/순토/쉐어워터 기기 연결과 동기화를 관리합니다.')}
            onPress={() => router.push(appRouteMap.bluetooth_devices.path as never)}
          />
          <ActionRow
            icon={<LogOut size={18} color="#ef4444" />}
            title={tx('settingsPage.logout', '로그아웃')}
            onPress={handleLogout}
            border={false}
            danger
          />
        </View>
      );
    }

    if (activeTab === 'notifications') {
      return (
        <View>
          <ToggleRow
            icon={<Bell size={18} color="#4d5d6b" />}
            title={tx('settingsPage.notifications.pushAll', '푸시 알림 전체')}
            subtitle={tx('settingsPage.notifications.pushAllSubtitle', '모든 앱 알림을 한 번에 켜고 끕니다.')}
            value={pushNotifications}
            onToggle={updateAllNotifications}
          />
          <ToggleRow icon={<Bell size={18} color="#4d5d6b" />} title={tx('settingsPage.notifications.likes', '좋아요 알림')} value={likeNotifications} onToggle={(next) => updateNotificationSetting('likeNotifications', next)} />
          <ToggleRow icon={<Mail size={18} color="#4d5d6b" />} title={tx('settingsPage.notifications.comments', '댓글 알림')} value={commentNotifications} onToggle={(next) => updateNotificationSetting('commentNotifications', next)} />
          <ToggleRow icon={<UserRoundCog size={18} color="#4d5d6b" />} title={tx('settingsPage.notifications.follows', '팔로우 알림')} value={followNotifications} onToggle={(next) => updateNotificationSetting('followNotifications', next)} />
          <ToggleRow icon={<Bell size={18} color="#4d5d6b" />} title={tx('settingsPage.notifications.events', '이벤트 알림')} value={eventNotifications} onToggle={(next) => updateNotificationSetting('eventNotifications', next)} />
          <ActionRow
            icon={<Settings size={18} color="#4d5d6b" />}
            title={tx('settingsPage.notifications.detail', '알림 세부 설정')}
            subtitle={tx('settingsPage.notifications.detailSubtitle', '날씨/동기화 관련 알림을 개별 설정합니다.')}
            onPress={() => router.push(appRouteMap.notification_settings.path as never)}
            border={false}
          />
        </View>
      );
    }

    if (activeTab === 'privacy') {
      return (
        <View>
          <ToggleRow
            icon={<User size={18} color="#4d5d6b" />}
            title={tx('settingsPage.privacy.profilePublic', '프로필 공개 여부')}
            value={profilePublic}
            onToggle={(next) => updatePrivacySetting('profilePublic', next)}
          />
          <ActionRow
            icon={<Globe size={18} color="#4d5d6b" />}
            title={tx('settingsPage.privacy.postVisibility', '게시글 공개 범위')}
            value={labelMap.visibility[postVisibility]}
            onPress={pickPostVisibility}
          />
          <ActionRow
            icon={<MapPin size={18} color="#4d5d6b" />}
            title={tx('settingsPage.privacy.logVisibility', '다이빙 로그 공개 범위')}
            value={labelMap.visibility[diveLogVisibility]}
            onPress={pickDiveLogVisibility}
          />
          <ToggleRow
            icon={<MapPin size={18} color="#4d5d6b" />}
            title={tx('settingsPage.privacy.locationSharing', '위치 정보 공유')}
            value={locationSharing}
            onToggle={(next) => updatePrivacySetting('locationSharing', next)}
          />
          <ActionRow
            icon={<Shield size={18} color="#4d5d6b" />}
            title={tx('settingsPage.privacy.blockedUsers', '차단 사용자 관리')}
            onPress={() => router.push('/(tabs)/settings-detail?mode=blocked-users' as never)}
            border={false}
          />
        </View>
      );
    }

    if (activeTab === 'diving') {
      return (
        <View>
          <ActionRow
            icon={<Shield size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.certifications', '자격증/레벨 관리')}
            subtitle={tx('settingsPage.diving.certificationsSubtitle', '보유 자격과 레벨을 갱신합니다.')}
            onPress={() => router.push(appRouteMap.certifications.path as never)}
          />
          <ActionRow
            icon={<Bluetooth size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.equipment', '장비/기기 관리')}
            onPress={() => router.push(appRouteMap.bluetooth_devices.path as never)}
          />
          <ActionRow
            icon={<Link2 size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.integration', '외부 서비스 연동')}
            subtitle={tx('settingsPage.diving.integrationSubtitle', 'Google Maps, Stormglass, Garmin, Suunto, Shearwater 상태를 관리합니다.')}
            onPress={() => router.push(appRouteMap.integration_settings.path as never)}
          />
          <ActionRow
            icon={<MapPin size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.marineWeather', '해양 날씨')}
            subtitle={tx('settingsPage.diving.marineWeatherSubtitle', '포인트별 파고/조류/수온을 확인합니다.')}
            onPress={() => router.push(appRouteMap.marine_weather.path as never)}
          />
          <ActionRow
            icon={<MapPin size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.points', '활동지역/관심 포인트 설정')}
            onPress={() => router.push(appRouteMap.location.path as never)}
          />
          <ActionRow
            icon={<Link2 size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.diveLogManagement', 'DiveLog 관리')}
            subtitle={tx('settingsPage.diving.diveLogManagementSubtitle', '외부 연동 로그, 동기화 상태, 편집 대기 로그를 관리합니다.')}
            onPress={() => router.push(appRouteMap.dive_log_management.path as never)}
          />
          <ActionRow
            icon={<Settings size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.unitSettings', '단위 설정')}
            subtitle={tx('settingsPage.diving.unitSettingsSubtitle', '수심/수온/기체 단위를 한 곳에서 설정합니다.')}
            value={`${labelMap.depth[depthUnit]} · ${labelMap.temp[temperatureUnit]} · ${labelMap.gas[gasPressureUnit]}`}
            onPress={() => router.push('/(tabs)/settings-detail?mode=unit-settings' as never)}
            border={false}
          />
        </View>
      );
    }

    if (activeTab === 'app') {
      return (
        <View>
          <ActionRow
            icon={<SunMoon size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.themeMode', '테마 모드')}
            value={labelMap.theme[theme]}
            onPress={pickThemeMode}
          />
          <ActionRow
            icon={<Globe size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.language', '언어 설정')}
            value={labelMap.language[language]}
            onPress={pickLanguage}
          />
          <ActionRow
            icon={<Link2 size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.aiSettings', 'AI 설정')}
            subtitle={tx('settingsPage.app.aiSettingsSubtitle', 'AI 요약/캡션/위험도 설명 사용 여부를 관리합니다.')}
            onPress={() => router.push(appRouteMap.ai_settings.path as never)}
          />
          <ActionRow
            icon={<Link2 size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.bottomMenuManager', '하단메뉴 관리')}
            subtitle={tx('settingsPage.app.bottomMenuManagerSubtitle', '하단 탭 구성과 순서를 변경합니다.')}
            onPress={() => router.push('/(tabs)/settings-detail?mode=bottom-menu' as never)}
          />
          <ActionRow
            icon={<HelpCircle size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.clearCache', '캐시 삭제')}
            onPress={clearCache}
            border={false}
          />
        </View>
      );
    }

    return (
      <View>
        <ActionRow
          icon={<UserRoundCog size={18} color="#4d5d6b" />}
          title={tx('settingsPage.safety.emergencyContact', '비상 연락처 등록')}
          onPress={() => router.push('/(tabs)/settings-detail?mode=emergency-contact' as never)}
        />
        <ToggleRow
          icon={<Shield size={18} color="#4d5d6b" />}
          title={tx('settingsPage.safety.emergencyShare', '긴급 상황 공유 설정')}
          value={emergencyShareEnabled}
          onToggle={(next) => updateSafetySetting('emergencyShareEnabled', next)}
        />
        <ActionRow
          icon={<HelpCircle size={18} color="#4d5d6b" />}
          title={tx('settingsPage.safety.guide', '다이빙 안전 가이드 보기')}
          onPress={() => router.push('/(tabs)/settings-detail?mode=safety-guide' as never)}
        />
        <ActionRow
          icon={<Link2 size={18} color="#4d5d6b" />}
          title={tx('settingsPage.safety.insurance', '보험 정보 등록')}
          onPress={() => router.push('/(tabs)/settings-detail?mode=insurance' as never)}
          border={false}
        />
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={[styles.tabGridCard, { backgroundColor: shellColors.cardBg, borderColor: shellColors.cardBorder }]}>
          <View style={styles.tabGridWrap}>
            {settingsTabs.map((tabId) => {
              const meta = tabMeta[tabId];
              return (
                <SectionChip
                  key={tabId}
                  active={activeTab === tabId}
                  icon={meta.icon}
                  label={meta.label}
                  onPress={() => setActiveTab(tabId)}
                />
              );
            })}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: shellColors.cardBg, borderColor: shellColors.cardBorder }]}>
          <View style={[styles.sectionHeader, { backgroundColor: shellColors.headerBg, borderBottomColor: shellColors.headerBorder }]}>
            <View style={[styles.sectionHeaderIconWrap, { backgroundColor: shellColors.headerIconBg }]}>
              <ActiveIcon size={18} color="#0d5fa8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionHeaderTitle, { color: shellColors.headerTitle }]}>{activeMeta.label}</Text>
              <Text style={[styles.sectionHeaderSubtitle, { color: shellColors.headerSubtitle }]}>{activeMeta.subtitle}</Text>
            </View>
          </View>
          {renderTabContent()}
        </View>

        <View style={[styles.footerCard, { backgroundColor: shellColors.cardBg, borderColor: shellColors.cardBorder }]}>
          <Text style={[styles.footerTitle, { color: shellColors.footerTitle }]}>{tx('settingsPage.appInfoTitle', '앱 정보')}</Text>
          <View style={styles.footerRow}>
            <Text style={[styles.footerValue, { color: shellColors.footerValue }]}>{tx('settingsPage.versionLabel', '버전 {{version}}', { version })}</Text>
            <Text style={[styles.footerCopy, { color: shellColors.footerCopy }]}>© {appYear} Divergram</Text>
          </View>
          <TouchableOpacity style={styles.accountDeleteLinkWrap} onPress={handleAccountDelete} activeOpacity={0.84}>
            <Text style={[styles.accountDeleteLinkText, { color: shellColors.accountDelete }]}>{tx('settingsPage.account.deleteTextLink', '다이버그램 계정탈퇴')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#dbe7f2',
    backgroundColor: '#ffffff',
    padding: 16,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eaf3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0d5fa8',
  },
  profileTextWrap: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  profileActionRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  headerActionButton: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d2deea',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  headerActionButtonPrimary: {
    marginLeft: 0,
    marginRight: 6,
    backgroundColor: '#0d5fa8',
    borderColor: '#0d5fa8',
  },
  headerActionTextPrimary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34516d',
  },
  profileMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  metaPill: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1ebf4',
    backgroundColor: '#f8fbff',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 8,
  },
  metaPillLabel: {
    fontSize: 11,
    color: '#64809a',
    fontWeight: '600',
  },
  metaPillValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabGridCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dbe7f2',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tabGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectionChip: {
    width: '32%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dde8f2',
    backgroundColor: '#f8fbff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sectionChipActive: {
    backgroundColor: '#0d5fa8',
    borderColor: '#0d5fa8',
  },
  sectionChipIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#e9f2fb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  sectionChipIconWrapActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  sectionChipLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#45617b',
  },
  sectionChipLabelActive: {
    color: '#ffffff',
  },
  sectionCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dbe7f2',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e8eff5',
    backgroundColor: '#f4f9ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dcecff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionHeaderSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#69829a',
    lineHeight: 16,
  },
  sectionTopWrap: {
    borderBottomWidth: 1,
    borderBottomColor: '#e8eff5',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  sectionTopLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6a8298',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  socialRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  socialButton: {
    width: '31.5%',
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e1ebf4',
    backgroundColor: '#f8fbff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  socialBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d9e6f2',
  },
  socialLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#12263b',
  },
  socialAction: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    color: '#69829a',
  },
  rowBase: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e8eff5',
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#edf3f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIconWrapDanger: {
    backgroundColor: '#fff1f2',
  },
  rowTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowTitleDanger: {
    color: '#ef4444',
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#70859a',
    lineHeight: 17,
  },
  valueChip: {
    marginRight: 8,
    borderRadius: 99,
    backgroundColor: '#edf3f9',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  valueChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#49637c',
  },
  footerCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe7f2',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12263b',
  },
  footerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerValue: {
    fontSize: 12,
    color: '#64809a',
  },
  footerCopy: {
    fontSize: 12,
    color: '#94a3b8',
  },
  accountDeleteLinkWrap: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  accountDeleteLinkText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
});
