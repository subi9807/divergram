import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, CreditCard, FileText, HandCoins, HelpCircle, Link2, Mail, MapPin, Shield } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { useResolvedTheme } from '../../src/hooks/useResolvedTheme';
import { appRouteMap } from '../../src/config/sitemap';

type AppInfoItem = {
  key: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
};

export default function AppInfoScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isDark } = useResolvedTheme();

  const colors = isDark
    ? {
        title: '#E2E8F0',
        subtitle: '#9FB3C8',
        cardBg: '#0F1B2A',
        cardBorder: '#243447',
        rowBorder: '#243447',
        rowTitle: '#E2E8F0',
        rowSub: '#9FB3C8',
        iconBg: '#172534',
        chevron: '#9FB3C8',
      }
    : {
        title: '#0F172A',
        subtitle: '#64748B',
        cardBg: '#FFFFFF',
        cardBorder: '#D7E4F1',
        rowBorder: '#E8EFF5',
        rowTitle: '#0F172A',
        rowSub: '#70859A',
        iconBg: '#EDF3F9',
        chevron: '#7C8A99',
      };

  const items: AppInfoItem[] = [
    {
      key: 'terms',
      title: t('settingsPage.app.terms', { defaultValue: '이용약관' }),
      icon: <FileText size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.terms_policy.path as never),
    },
    {
      key: 'privacy',
      title: t('settingsPage.app.privacyPolicy', { defaultValue: '개인정보처리방침' }),
      icon: <Shield size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.privacy_policy.path as never),
    },
    {
      key: 'location_terms',
      title: t('settingsPage.app.locationTerms', { defaultValue: '위치정보 이용약관' }),
      icon: <MapPin size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.location_policy.path as never),
    },
    {
      key: 'community',
      title: t('settingsPage.app.communityPolicy', { defaultValue: '커뮤니티 운영정책' }),
      icon: <HelpCircle size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.community_policy.path as never),
    },
    {
      key: 'safety',
      title: t('settingsPage.app.safetyNotice', { defaultValue: '안전 고지' }),
      icon: <Shield size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.safety_disclaimer.path as never),
    },
    {
      key: 'ai_notice',
      title: t('settingsPage.app.aiNotice', { defaultValue: 'AI 기능 안내' }),
      icon: <Link2 size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.ai_usage_policy.path as never),
    },
    {
      key: 'open_source',
      title: t('settingsPage.app.openSourceLicenses', { defaultValue: '오픈소스 라이선스' }),
      icon: <FileText size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.open_source_licenses.path as never),
    },
    {
      key: 'license_management',
      title: t('settingsPage.diving.licenseManagement', { defaultValue: '라이선스 관리' }),
      subtitle: t('settingsPage.diving.licenseManagementSubtitle', { defaultValue: '내 라이선스를 조회, 등록, 수정, 삭제할 수 있습니다.' }),
      icon: <CreditCard size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.license_management.path as never),
    },
    {
      key: 'donate',
      title: t('settingsPage.app.donate', { defaultValue: '후원하기' }),
      subtitle: t('settingsPage.app.donateSubtitle', { defaultValue: 'Divergram을 응원하고 개발을 지원합니다.' }),
      icon: <HandCoins size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.donate.path as never),
    },
    {
      key: 'customer_center',
      title: t('settingsPage.app.customerCenter', { defaultValue: '고객센터' }),
      icon: <HelpCircle size={18} color="#4d5d6b" />,
      onPress: () => router.push('/(tabs)/settings-detail?mode=customer-center' as never),
    },
    {
      key: 'contact',
      title: t('settingsPage.app.contact', { defaultValue: '문의하기' }),
      subtitle: t('pages.report.subtitle', { defaultValue: '서비스 문제를 남겨주세요' }),
      icon: <Mail size={18} color="#4d5d6b" />,
      onPress: () => router.push(appRouteMap.report.path as never),
    },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 64 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.title }}>{t('settingsPage.app.appInfo', { defaultValue: '앱 정보' })}</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>{t('settingsPage.app.appInfoSubtitle', { defaultValue: '약관, 정책, 고객 지원 항목을 관리합니다.' })}</Text>

        <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, overflow: 'hidden' }}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.86}
              onPress={item.onPress}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: index === items.length - 1 ? 0 : 1,
                borderBottomColor: colors.rowBorder,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                {item.icon}
              </View>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.rowTitle }}>{item.title}</Text>
                {item.subtitle ? <Text style={{ marginTop: 4, fontSize: 12, color: colors.rowSub }}>{item.subtitle}</Text> : null}
              </View>
              <ChevronRight size={18} color={colors.chevron} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
