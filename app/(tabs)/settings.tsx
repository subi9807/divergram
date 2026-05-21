import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
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
  User,
  UserRoundCog,
} from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { appRouteMap } from '../../src/config/sitemap';

const languageOptions: ('ko' | 'en' | 'ja' | 'zh')[] = ['ko', 'en', 'ja', 'zh'];
type SettingsTab = 'account' | 'notifications' | 'privacy' | 'diving' | 'app' | 'safety';
type IconComponent = React.ComponentType<{ size?: number | string; color?: any }>;

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
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={[styles.rowBase, border ? styles.rowBorder : undefined]}>
      <View style={[styles.rowIconWrap, danger ? styles.rowIconWrapDanger : undefined]}>{icon}</View>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, danger ? styles.rowTitleDanger : undefined]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? (
        <View style={styles.valueChip}>
          <Text style={styles.valueChipText}>{value}</Text>
        </View>
      ) : null}
      <ChevronRight size={18} color={danger ? '#ef4444' : '#7c8a99'} />
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
  return (
    <View style={[styles.rowBase, border ? styles.rowBorder : undefined]}>
      <View style={styles.rowIconWrap}>{icon}</View>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onToggle} trackColor={{ false: '#dbe3ec', true: '#0d5fa8' }} thumbColor="#ffffff" />
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
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={onPress}
      style={[styles.sectionChip, active ? styles.sectionChipActive : undefined]}
    >
      <View style={[styles.sectionChipIconWrap, active ? styles.sectionChipIconWrapActive : undefined]}>
        <Icon size={16} color={active ? '#ffffff' : '#4f6275'} />
      </View>
      <Text style={[styles.sectionChipLabel, active ? styles.sectionChipLabelActive : undefined]} numberOfLines={1}>
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
  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={styles.socialButton}>
      {badge}
      <Text style={styles.socialLabel}>{label}</Text>
      <Text style={styles.socialAction}>{actionLabel}</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
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
  const preferredDiveType = useSettingsStore((state) => state.preferredDiveType);
  const depthUnit = useSettingsStore((state) => state.depthUnit);
  const temperatureUnit = useSettingsStore((state) => state.temperatureUnit);
  const emergencyShareEnabled = useSettingsStore((state) => state.emergencyShareEnabled);

  const updateLanguage = useSettingsStore((state) => state.updateLanguage);
  const updateTheme = useSettingsStore((state) => state.updateTheme);
  const updateNotificationSetting = useSettingsStore((state) => state.updateNotificationSetting);
  const updatePrivacySetting = useSettingsStore((state) => state.updatePrivacySetting);
  const updateSafetySetting = useSettingsStore((state) => state.updateSafetySetting);
  const updatePostVisibility = useSettingsStore((state) => state.updatePostVisibility);
  const updateDiveLogVisibility = useSettingsStore((state) => state.updateDiveLogVisibility);
  const updatePreferredDiveType = useSettingsStore((state) => state.updatePreferredDiveType);
  const updateDepthUnit = useSettingsStore((state) => state.updateDepthUnit);
  const updateTemperatureUnit = useSettingsStore((state) => state.updateTemperatureUnit);

  const version = Constants.expoConfig?.version || '1.0.0';
  const appYear = new Date().getFullYear();

  const tx = (key: string, fallback: string, params?: Record<string, unknown>) =>
    t(key, { defaultValue: fallback, ...(params || {}) });

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
      subtitle: tx('settingsPage.tabSubtitles.account', '소셜 연동, 로그인 기기, 계정 보안을 설정하세요.'),
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
      subtitle: tx('settingsPage.tabSubtitles.diving', '다이빙 타입과 단위를 활동 방식에 맞게 설정하세요.'),
      icon: MapPin,
    },
    app: {
      label: tx('settingsPage.sections.app', '앱 설정'),
      subtitle: tx('settingsPage.tabSubtitles.app', '언어, 테마, 정책 및 지원 메뉴를 관리하세요.'),
      icon: Settings,
    },
    safety: {
      label: tx('settingsPage.sections.safety', '안전 설정'),
      subtitle: tx('settingsPage.tabSubtitles.safety', '긴급 연락 및 안전 공유 옵션을 구성하세요.'),
      icon: HelpCircle,
    },
  };

  const tabs: SettingsTab[] = ['account', 'notifications', 'privacy', 'diving', 'app', 'safety'];

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
    diveType: {
      scuba: tx('settingsPage.options.diveType.scuba', '스쿠버'),
      freediving: tx('settingsPage.options.diveType.freediving', '프리다이빙'),
      snorkeling: tx('settingsPage.options.diveType.snorkeling', '스노클링'),
    },
    depth: {
      m: tx('settingsPage.options.depthUnit.m', 'm'),
      ft: tx('settingsPage.options.depthUnit.ft', 'ft'),
    },
    temp: {
      c: tx('settingsPage.options.tempUnit.c', '℃'),
      f: tx('settingsPage.options.tempUnit.f', '℉'),
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

  const pickDiveType = () => {
    Alert.alert(
      tx('settingsPage.diving.diveType', '다이빙 타입 선택'),
      tx('settingsPage.common.selectOption', '옵션을 선택하세요.'),
      [
        { text: labelMap.diveType.scuba, onPress: () => updatePreferredDiveType('scuba') },
        { text: labelMap.diveType.freediving, onPress: () => updatePreferredDiveType('freediving') },
        { text: labelMap.diveType.snorkeling, onPress: () => updatePreferredDiveType('snorkeling') },
        { text: tx('common.cancel', '취소'), style: 'cancel' as const },
      ]
    );
  };

  const pickDepthUnit = () => {
    Alert.alert(
      tx('settingsPage.diving.depthUnit', '수심 단위'),
      tx('settingsPage.common.selectOption', '옵션을 선택하세요.'),
      [
        { text: labelMap.depth.m, onPress: () => updateDepthUnit('m') },
        { text: labelMap.depth.ft, onPress: () => updateDepthUnit('ft') },
        { text: tx('common.cancel', '취소'), style: 'cancel' as const },
      ]
    );
  };

  const pickTempUnit = () => {
    Alert.alert(
      tx('settingsPage.diving.tempUnit', '수온 단위'),
      tx('settingsPage.common.selectOption', '옵션을 선택하세요.'),
      [
        { text: labelMap.temp.c, onPress: () => updateTemperatureUnit('c') },
        { text: labelMap.temp.f, onPress: () => updateTemperatureUnit('f') },
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
                actionLabel={tx('settingsPage.account.linkAction', '연동하기')}
                onPress={() => router.push('/(tabs)/settings-detail?mode=link-google' as never)}
                badge={
                  <View style={[styles.socialBadge, { borderColor: '#c9d9ee' }]}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#2563eb' }}>G</Text>
                  </View>
                }
              />
              <SocialButton
                label="Apple"
                actionLabel={tx('settingsPage.account.linkAction', '연동하기')}
                onPress={() => router.push('/(tabs)/settings-detail?mode=link-apple' as never)}
                badge={
                  <View style={[styles.socialBadge, { backgroundColor: '#111827' }]}>
                    <Apple size={16} color="#ffffff" />
                  </View>
                }
              />
              <SocialButton
                label="Kakao"
                actionLabel={tx('settingsPage.account.linkAction', '연동하기')}
                onPress={() => router.push('/(tabs)/settings-detail?mode=link-kakao' as never)}
                badge={
                  <View style={[styles.socialBadge, { backgroundColor: '#FEE500' }]}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#191919' }}>K</Text>
                  </View>
                }
              />
            </View>
          </View>
          <ActionRow
            icon={<Bluetooth size={18} color="#4d5d6b" />}
            title={tx('settingsPage.account.devices', '로그인 기기 관리')}
            subtitle={tx('settingsPage.account.devicesSubtitle', '현재 로그인된 기기를 확인하고 관리합니다.')}
            onPress={() => router.push(appRouteMap.devices.path as never)}
          />
          <ActionRow
            icon={<Shield size={18} color="#ef4444" />}
            title={tx('settingsPage.account.deleteAccount', '계정 삭제')}
            subtitle={tx('settingsPage.account.deleteSubtitle', '계정 삭제는 복구할 수 없습니다.')}
            onPress={handleAccountDelete}
            danger
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
            onToggle={(next) => updateNotificationSetting('pushNotifications', next)}
          />
          <ToggleRow icon={<Bell size={18} color="#4d5d6b" />} title={tx('settingsPage.notifications.likes', '좋아요 알림')} value={likeNotifications} onToggle={(next) => updateNotificationSetting('likeNotifications', next)} />
          <ToggleRow icon={<Mail size={18} color="#4d5d6b" />} title={tx('settingsPage.notifications.comments', '댓글 알림')} value={commentNotifications} onToggle={(next) => updateNotificationSetting('commentNotifications', next)} />
          <ToggleRow icon={<UserRoundCog size={18} color="#4d5d6b" />} title={tx('settingsPage.notifications.follows', '팔로우 알림')} value={followNotifications} onToggle={(next) => updateNotificationSetting('followNotifications', next)} />
          <ToggleRow icon={<Bell size={18} color="#4d5d6b" />} title={tx('settingsPage.notifications.events', '이벤트 알림')} value={eventNotifications} onToggle={(next) => updateNotificationSetting('eventNotifications', next)} border={false} />
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
            icon={<MapPin size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.diveType', '다이빙 타입 선택')}
            value={labelMap.diveType[preferredDiveType]}
            onPress={pickDiveType}
          />
          <ActionRow
            icon={<Shield size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.certifications', '자격증/레벨 관리')}
            subtitle={tx('settingsPage.diving.certificationsSubtitle', '보유 자격과 레벨을 갱신합니다.')}
            onPress={() => router.push(appRouteMap.profile_edit.path as never)}
          />
          <ActionRow
            icon={<Bluetooth size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.equipment', '장비/기기 관리')}
            onPress={() => router.push(appRouteMap.devices.path as never)}
          />
          <ActionRow
            icon={<MapPin size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.points', '활동지역/관심 포인트 설정')}
            onPress={() => router.push(appRouteMap.location.path as never)}
          />
          <ActionRow
            icon={<Settings size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.depthUnit', '수심 단위 설정')}
            value={labelMap.depth[depthUnit]}
            onPress={pickDepthUnit}
          />
          <ActionRow
            icon={<Settings size={18} color="#4d5d6b" />}
            title={tx('settingsPage.diving.tempUnit', '수온 단위 설정')}
            value={labelMap.temp[temperatureUnit]}
            onPress={pickTempUnit}
            border={false}
          />
        </View>
      );
    }

    if (activeTab === 'app') {
      return (
        <View>
          <ToggleRow
            icon={<Settings size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.darkMode', '다크모드')}
            value={theme === 'dark'}
            onToggle={(next) => updateTheme(next ? 'dark' : 'light')}
          />
          <ActionRow
            icon={<Globe size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.language', '언어 설정')}
            value={labelMap.language[language]}
            onPress={pickLanguage}
          />
          <ActionRow
            icon={<HelpCircle size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.clearCache', '캐시 삭제')}
            onPress={clearCache}
          />
          <ActionRow
            icon={<Settings size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.version', '앱 버전 확인')}
            value={version}
            onPress={() => Alert.alert(tx('settingsPage.app.version', '앱 버전 확인'), `Divergram ${version}`)}
          />
          <ActionRow
            icon={<HelpCircle size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.terms', '이용약관')}
            onPress={() => router.push(appRouteMap.auth_terms.path as never)}
          />
          <ActionRow
            icon={<Shield size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.privacyPolicy', '개인정보처리방침')}
            onPress={() => router.push(appRouteMap.auth_privacy.path as never)}
          />
          <ActionRow
            icon={<HelpCircle size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.customerCenter', '고객센터')}
            onPress={() => router.push('/(tabs)/settings-detail?mode=customer-center' as never)}
          />
          <ActionRow
            icon={<Mail size={18} color="#4d5d6b" />}
            title={tx('settingsPage.app.contact', '문의하기')}
            onPress={() => router.push(appRouteMap.report.path as never)}
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
        <View style={styles.tabGridCard}>
          <View style={styles.tabGridWrap}>
            {tabs.map((tabId) => {
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

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIconWrap}>
              <ActiveIcon size={18} color="#0d5fa8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeaderTitle}>{activeMeta.label}</Text>
              <Text style={styles.sectionHeaderSubtitle}>{activeMeta.subtitle}</Text>
            </View>
          </View>
          {renderTabContent()}
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>{tx('settingsPage.appInfoTitle', '앱 정보')}</Text>
          <View style={styles.footerRow}>
            <Text style={styles.footerValue}>{tx('settingsPage.versionLabel', '버전 {{version}}', { version })}</Text>
            <Text style={styles.footerCopy}>© {appYear} Divergram</Text>
          </View>
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
    justifyContent: 'space-between',
  },
  socialButton: {
    width: '31.5%',
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
});
