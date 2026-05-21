import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ChevronLeft, CircleAlert, CircleCheck, Link2, Trash2 } from 'lucide-react-native';
import { Screen } from '../../src/components/Screen';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/components/Toast';
import { useSettingsFeatureStore, type SocialProvider } from '../../src/stores/settingsFeatureStore';
import { bottomTabCandidates, bottomTabDefault, type BottomTabRoute, useSettingsStore } from '../../src/stores/settingsStore';
import { appRouteMap } from '../../src/config/sitemap';
import { apiClient } from '../../src/lib/api';

function pickParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

type DetailMode =
  | 'link-google'
  | 'link-apple'
  | 'link-kakao'
  | 'account-delete'
  | 'blocked-users'
  | 'customer-center'
  | 'emergency-contact'
  | 'safety-guide'
  | 'insurance'
  | 'bottom-menu';

function asMode(value: string): DetailMode {
  const allowed: DetailMode[] = [
    'link-google',
    'link-apple',
    'link-kakao',
    'account-delete',
    'blocked-users',
    'customer-center',
    'emergency-contact',
    'safety-guide',
    'insurance',
    'bottom-menu',
  ];
  return allowed.includes(value as DetailMode) ? (value as DetailMode) : 'customer-center';
}

function cardInputBaseClassName(error = false) {
  return `rounded-xl border px-3 py-3 text-surface-900 ${error ? 'border-red-300 bg-red-50/40' : 'border-surface-200 bg-white'}`;
}

export default function SettingsDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const mode = asMode(pickParam(params.mode));

  const { loginWithGoogle, loginWithApple, loginWithKakao, logout } = useAuth();
  const socialLinks = useSettingsFeatureStore((state) => state.socialLinks);
  const setSocialLinked = useSettingsFeatureStore((state) => state.setSocialLinked);
  const blockedUsers = useSettingsFeatureStore((state) => state.blockedUsers);
  const addBlockedUser = useSettingsFeatureStore((state) => state.addBlockedUser);
  const removeBlockedUser = useSettingsFeatureStore((state) => state.removeBlockedUser);
  const savedEmergencyContact = useSettingsFeatureStore((state) => state.emergencyContact);
  const setEmergencyContact = useSettingsFeatureStore((state) => state.setEmergencyContact);
  const savedInsuranceInfo = useSettingsFeatureStore((state) => state.insuranceInfo);
  const setInsuranceInfo = useSettingsFeatureStore((state) => state.setInsuranceInfo);

  const emergencyShareEnabled = useSettingsStore((state) => state.emergencyShareEnabled);
  const bottomTabItems = useSettingsStore((state) => state.bottomTabItems);
  const updateSafetySetting = useSettingsStore((state) => state.updateSafetySetting);
  const updateBottomTabItems = useSettingsStore((state) => state.updateBottomTabItems);

  const [busy, setBusy] = useState(false);

  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const canDelete = confirmDeleteText.trim().toUpperCase() === 'DELETE';

  const [blockedName, setBlockedName] = useState('');
  const [blockedReason, setBlockedReason] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');

  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceEmergencyPhone, setInsuranceEmergencyPhone] = useState('');
  const [insuranceValidUntil, setInsuranceValidUntil] = useState('');
  const [menuDraft, setMenuDraft] = useState<BottomTabRoute[]>(bottomTabItems);

  useEffect(() => {
    setContactName(savedEmergencyContact.name || '');
    setContactPhone(savedEmergencyContact.phone || '');
    setContactRelation(savedEmergencyContact.relation || '');
  }, [savedEmergencyContact.name, savedEmergencyContact.phone, savedEmergencyContact.relation]);

  useEffect(() => {
    setInsuranceProvider(savedInsuranceInfo.provider || '');
    setInsurancePolicyNumber(savedInsuranceInfo.policyNumber || '');
    setInsuranceEmergencyPhone(savedInsuranceInfo.emergencyPhone || '');
    setInsuranceValidUntil(savedInsuranceInfo.validUntil || '');
  }, [savedInsuranceInfo.emergencyPhone, savedInsuranceInfo.policyNumber, savedInsuranceInfo.provider, savedInsuranceInfo.validUntil]);

  useEffect(() => {
    setMenuDraft(bottomTabItems);
  }, [bottomTabItems]);

  const title = useMemo(() => {
    if (mode === 'link-google') return t('settingsPage.account.googleLink', { defaultValue: 'Google 로그인 연동' });
    if (mode === 'link-apple') return t('settingsPage.account.appleLink', { defaultValue: 'Apple 로그인 연동' });
    if (mode === 'link-kakao') return t('settingsPage.account.kakaoLink', { defaultValue: 'Kakao 로그인 연동' });
    if (mode === 'account-delete') return t('settingsPage.account.deleteAccount', { defaultValue: '계정 삭제' });
    if (mode === 'blocked-users') return t('settingsPage.privacy.blockedUsers', { defaultValue: '차단 사용자 관리' });
    if (mode === 'customer-center') return t('settingsPage.app.customerCenter', { defaultValue: '고객센터' });
    if (mode === 'bottom-menu') return t('settingsPage.app.bottomMenuManager', { defaultValue: '하단메뉴 관리' });
    if (mode === 'emergency-contact') return t('settingsPage.safety.emergencyContact', { defaultValue: '비상 연락처 등록' });
    if (mode === 'safety-guide') return t('settingsPage.safety.guide', { defaultValue: '다이빙 안전 가이드 보기' });
    return t('settingsPage.safety.insurance', { defaultValue: '보험 정보 등록' });
  }, [mode, t]);

  const subtitle = useMemo(() => {
    if (mode.startsWith('link-')) return t('settingsPage.account.socialSubtitle', { defaultValue: '소셜 계정을 연결해 로그인 편의성과 계정 보안을 강화하세요.' });
    if (mode === 'account-delete') return t('settingsPage.account.deleteSubtitle', { defaultValue: '계정 삭제는 복구할 수 없습니다.' });
    if (mode === 'blocked-users') return t('settingsPage.privacy.blockedUsers', { defaultValue: '차단 사용자 관리' });
    if (mode === 'customer-center') return t('pages.report.subtitle', { defaultValue: '서비스 문제를 남겨주세요' });
    if (mode === 'bottom-menu') return t('settingsPage.app.bottomMenuManagerSubtitle', { defaultValue: '하단 탭 구성과 순서를 변경합니다.' });
    if (mode === 'emergency-contact') return t('settingsPage.safety.emergencyShare', { defaultValue: '긴급 상황 공유 설정' });
    if (mode === 'safety-guide') return t('settingsPage.safety.guide', { defaultValue: '다이빙 안전 가이드 보기' });
    return t('settingsPage.safety.insurance', { defaultValue: '보험 정보 등록' });
  }, [mode, t]);

  const socialProvider = useMemo<SocialProvider | null>(() => {
    if (mode === 'link-google') return 'google';
    if (mode === 'link-apple') return 'apple';
    if (mode === 'link-kakao') return 'kakao';
    return null;
  }, [mode]);

  const socialLabel = useMemo(() => {
    if (socialProvider === 'google') return 'Google';
    if (socialProvider === 'apple') return 'Apple';
    if (socialProvider === 'kakao') return 'Kakao';
    return '';
  }, [socialProvider]);

  const socialLinked = socialProvider ? socialLinks[socialProvider]?.linked : false;
  const socialLinkedAt = socialProvider ? socialLinks[socialProvider]?.linkedAt : '';

  const handleLinkProvider = async () => {
    if (!socialProvider || busy) return;
    setBusy(true);
    try {
      if (socialProvider === 'google') await loginWithGoogle();
      if (socialProvider === 'apple') await loginWithApple();
      if (socialProvider === 'kakao') await loginWithKakao();
      setSocialLinked(socialProvider, true);
      showToast({
        type: 'success',
        title: t('common.success', { defaultValue: '완료' }),
        message: t('settingsPage.account.linkAction', { defaultValue: '연동하기' }),
      });
    } catch (error: any) {
      const message = String(error?.response?.data?.error || error?.message || '').trim();
      showToast({
        type: 'error',
        title: t('auth.error', { defaultValue: '오류' }),
        message: message || t('auth.loginFailed', { defaultValue: '로그인 처리에 실패했습니다.' }),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUnlinkProvider = () => {
    if (!socialProvider || !socialLinked) return;
    Alert.alert(
      t('common.confirm', { defaultValue: '확인' }),
      t('settingsPage.account.deleteConfirm', { defaultValue: '계정 연동을 해제하시겠어요?' }),
      [
        { text: t('common.cancel', { defaultValue: '취소' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: '삭제' }),
          style: 'destructive',
          onPress: () => {
            setSocialLinked(socialProvider, false);
            showToast({
              type: 'info',
              title: t('common.done', { defaultValue: '완료' }),
              message: `${socialLabel} ${t('common.cancel', { defaultValue: '취소' })}`,
            });
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    if (!canDelete || busy) return;
    Alert.alert(
      t('settingsPage.account.deleteAccount', { defaultValue: '계정 삭제' }),
      t('settingsPage.account.deleteConfirm', { defaultValue: '계정 삭제는 되돌릴 수 없습니다. 계속할까요?' }),
      [
        { text: t('common.cancel', { defaultValue: '취소' }), style: 'cancel' },
        {
          text: t('common.delete', { defaultValue: '삭제' }),
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const deleted = await apiClient.deleteAccount();
              logout();
              router.replace('/(auth)/login');
              showToast({
                type: deleted ? 'success' : 'info',
                title: t('common.done', { defaultValue: '완료' }),
                message: deleted
                  ? t('settingsPage.account.deleteAccount', { defaultValue: '계정 삭제' })
                  : t('settingsPage.common.comingSoonBody', {
                      defaultValue: '서버 계정 삭제 API가 없어 앱 세션만 정리되었습니다.',
                      feature: t('settingsPage.account.deleteAccount', { defaultValue: '계정 삭제' }),
                    }),
              });
            } catch (error: any) {
              const message = String(error?.response?.data?.error || error?.message || '').trim();
              showToast({
                type: 'error',
                title: t('auth.error', { defaultValue: '오류' }),
                message: message || t('settingsPage.account.deleteConfirm', { defaultValue: '계정 삭제 처리에 실패했습니다.' }),
              });
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleAddBlockedUser = () => {
    const result = addBlockedUser(blockedName, blockedReason);
    if (!result.ok) {
      if (result.code === 'empty') {
        showToast({ type: 'info', title: t('auth.fillAllFields', { defaultValue: '필수 항목을 입력해주세요.' }) });
      } else {
        showToast({ type: 'info', title: t('common.duplicate', { defaultValue: '이미 등록되어 있습니다.' }) });
      }
      return;
    }
    setBlockedName('');
    setBlockedReason('');
    showToast({ type: 'success', title: t('common.done', { defaultValue: '완료' }) });
  };

  const handleOpenMail = async () => {
    const url = 'mailto:support@divergram.com?subject=Divergram%20Support';
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    } else {
      showToast({ type: 'info', title: 'support@divergram.com' });
    }
  };

  const handleSaveEmergencyContact = () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      showToast({ type: 'info', title: t('auth.fillAllFields', { defaultValue: '필수 항목을 입력해주세요.' }) });
      return;
    }
    setEmergencyContact({ name: contactName, phone: contactPhone, relation: contactRelation });
    showToast({ type: 'success', title: t('common.done', { defaultValue: '완료' }) });
  };

  const handleSaveInsuranceInfo = () => {
    if (!insuranceProvider.trim() || !insurancePolicyNumber.trim()) {
      showToast({ type: 'info', title: t('auth.fillAllFields', { defaultValue: '필수 항목을 입력해주세요.' }) });
      return;
    }
    setInsuranceInfo({
      provider: insuranceProvider,
      policyNumber: insurancePolicyNumber,
      emergencyPhone: insuranceEmergencyPhone,
      validUntil: insuranceValidUntil,
    });
    showToast({ type: 'success', title: t('common.done', { defaultValue: '완료' }) });
  };

  const faqItems = [
    {
      q: t('settingsPage.app.customerCenter', { defaultValue: '고객센터' }),
      a: t('settingsPage.app.contact', { defaultValue: '문의하기' }),
    },
    {
      q: t('settingsPage.app.terms', { defaultValue: '이용약관' }),
      a: t('settingsPage.app.privacyPolicy', { defaultValue: '개인정보처리방침' }),
    },
    {
      q: t('settingsPage.notifications.pushAll', { defaultValue: '푸시 알림 전체 ON/OFF' }),
      a: t('settingsPage.notifications.pushAllSubtitle', { defaultValue: '모든 앱 알림을 한 번에 켜고 끕니다.' }),
    },
  ];

  const safetyGuideItems = [
    {
      title: t('logsForm.fields.visibility', { defaultValue: '시야 확인' }),
      body: t('settingsPage.safety.guide', { defaultValue: '입수 전 시야, 조류, 포인트 진입 경로를 확인하세요.' }),
    },
    {
      title: t('settingsPage.safety.emergencyContact', { defaultValue: '비상 연락처 등록' }),
      body: t('settingsPage.safety.emergencyShare', { defaultValue: '버디와 리조트에 비상 연락처를 공유하고 출수 시간을 알리세요.' }),
    },
    {
      title: t('settingsPage.diving.equipment', { defaultValue: '장비 정보 등록' }),
      body: t('settingsPage.diving.certificationsSubtitle', { defaultValue: '장비 점검 체크리스트를 출발 전 완료하세요.' }),
    },
  ];

  const bottomTabTitleKeyMap: Record<BottomTabRoute, string> = {
    index: appRouteMap.home.titleKey,
    explore: appRouteMap.explore.titleKey,
    location: appRouteMap.location.titleKey,
    logs: appRouteMap.logs.titleKey,
    profile: appRouteMap.profile.titleKey,
    messages: appRouteMap.messages.titleKey,
    notifications: appRouteMap.notifications.titleKey,
    saved: appRouteMap.saved.titleKey,
    resorts: appRouteMap.resorts.titleKey,
  };

  const toggleBottomTab = (routeName: BottomTabRoute) => {
    const exists = menuDraft.includes(routeName);
    if (exists) {
      if (routeName === 'index') {
        showToast({ type: 'info', title: t('settingsPage.app.bottomMenuRequired', { defaultValue: '홈 메뉴는 필수입니다.' }) });
        return;
      }
      if (menuDraft.length <= 3) {
        showToast({ type: 'info', title: t('settingsPage.app.bottomMenuMin', { defaultValue: '하단메뉴는 최소 3개가 필요합니다.' }) });
        return;
      }
      setMenuDraft(menuDraft.filter((item) => item !== routeName));
      return;
    }
    if (menuDraft.length >= 5) {
      showToast({ type: 'info', title: t('settingsPage.app.bottomMenuMax', { defaultValue: '하단메뉴는 최대 5개까지 선택할 수 있습니다.' }) });
      return;
    }
    setMenuDraft([...menuDraft, routeName]);
  };

  const moveBottomTab = (routeName: BottomTabRoute, direction: 'up' | 'down') => {
    const currentIndex = menuDraft.indexOf(routeName);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= menuDraft.length) return;
    const next = [...menuDraft];
    const temp = next[targetIndex];
    next[targetIndex] = next[currentIndex];
    next[currentIndex] = temp;
    setMenuDraft(next);
  };

  const saveBottomMenu = () => {
    updateBottomTabItems(menuDraft);
    showToast({
      type: 'success',
      title: t('common.done', { defaultValue: '완료' }),
      message: t('settingsPage.app.bottomMenuSaved', { defaultValue: '하단메뉴 구성을 저장했습니다.' }),
    });
    router.back();
  };

  const resetBottomMenu = () => {
    setMenuDraft(bottomTabDefault);
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View className="border-b border-surface-100 px-5 py-4">
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.back()}
            className="mb-3 h-9 w-9 items-center justify-center rounded-xl border border-surface-200 bg-white"
          >
            <ChevronLeft size={18} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-surface-900">{title}</Text>
          <Text className="mt-1 text-surface-500">{subtitle}</Text>
        </View>

        <View className="px-5 py-5">
          {socialProvider ? (
            <View className="rounded-3xl border border-surface-200 bg-white p-4">
              <View className="mb-3 flex-row items-center">
                {socialLinked ? <CircleCheck size={18} color="#0d5fa8" /> : <CircleAlert size={18} color="#f59e0b" />}
                <Text className="ml-2 text-sm font-semibold text-surface-800">
                  {socialLinked
                    ? `${socialLabel} ${t('settingsPage.account.linkAction', { defaultValue: '연동하기' })} ${t('common.done', { defaultValue: '완료' })}`
                    : `${socialLabel} ${t('settingsPage.account.linkAction', { defaultValue: '연동하기' })}`}
                </Text>
              </View>
              {socialLinkedAt ? (
                <Text className="mb-3 text-xs text-surface-500">Linked at: {new Date(socialLinkedAt).toLocaleString()}</Text>
              ) : null}
              <View className="flex-row">
                <TouchableOpacity
                  activeOpacity={0.86}
                  disabled={busy}
                  onPress={handleLinkProvider}
                  className={`mr-2 flex-1 rounded-xl px-3 py-3 ${busy ? 'bg-surface-300' : 'bg-brand-600'}`}
                >
                  <Text className="text-center text-sm font-semibold text-white">
                    {busy ? t('common.loading', { defaultValue: '처리중...' }) : t('settingsPage.account.linkAction', { defaultValue: '연동하기' })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.86}
                  disabled={!socialLinked || busy}
                  onPress={handleUnlinkProvider}
                  className={`flex-1 rounded-xl border px-3 py-3 ${socialLinked ? 'border-red-200 bg-red-50' : 'border-surface-200 bg-surface-100'}`}
                >
                  <Text className={`text-center text-sm font-semibold ${socialLinked ? 'text-red-600' : 'text-surface-400'}`}>
                    {t('common.delete', { defaultValue: '삭제' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {mode === 'account-delete' ? (
            <View className="rounded-3xl border border-red-200 bg-white p-4">
              <View className="mb-3 flex-row items-center">
                <Trash2 size={18} color="#ef4444" />
                <Text className="ml-2 text-sm font-semibold text-red-600">{t('settingsPage.account.deleteSubtitle', { defaultValue: '계정 삭제는 복구할 수 없습니다.' })}</Text>
              </View>
              <Text className="mb-2 text-xs text-surface-500">Type DELETE to continue</Text>
              <TextInput
                value={confirmDeleteText}
                onChangeText={setConfirmDeleteText}
                autoCapitalize="characters"
                placeholder="DELETE"
                placeholderTextColor="#9ca3af"
                className={cardInputBaseClassName(!canDelete && confirmDeleteText.length > 0)}
              />
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={handleDeleteAccount}
                disabled={!canDelete || busy}
                className={`mt-3 rounded-xl px-3 py-3 ${canDelete && !busy ? 'bg-red-500' : 'bg-surface-300'}`}
              >
                <Text className="text-center text-sm font-semibold text-white">{t('settingsPage.account.deleteAccount', { defaultValue: '계정 삭제' })}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {mode === 'blocked-users' ? (
            <View>
              <View className="rounded-3xl border border-surface-200 bg-white p-4">
                <Text className="mb-2 text-sm font-semibold text-surface-800">{t('settingsPage.privacy.blockedUsers', { defaultValue: '차단 사용자 관리' })}</Text>
                <TextInput
                  className={cardInputBaseClassName(false)}
                  value={blockedName}
                  onChangeText={setBlockedName}
                  placeholder={t('pages.search.placeholder', { defaultValue: '사용자명 입력' })}
                  placeholderTextColor="#9ca3af"
                />
                <TextInput
                  className={`${cardInputBaseClassName(false)} mt-2`}
                  value={blockedReason}
                  onChangeText={setBlockedReason}
                  placeholder={t('pages.report.placeholder', { defaultValue: '차단 사유(선택)' })}
                  placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity activeOpacity={0.86} onPress={handleAddBlockedUser} className="mt-3 rounded-xl bg-brand-600 px-3 py-3">
                  <Text className="text-center text-sm font-semibold text-white">{t('common.add', { defaultValue: '추가' })}</Text>
                </TouchableOpacity>
              </View>

              <View className="mt-3">
                {blockedUsers.length === 0 ? (
                  <View className="rounded-3xl border border-surface-200 bg-white p-4">
                    <Text className="text-sm text-surface-500">{t('pages.saved.empty', { defaultValue: '차단된 사용자가 없습니다.' })}</Text>
                  </View>
                ) : (
                  blockedUsers.map((item) => (
                    <View key={item.id} className="mb-2 rounded-2xl border border-surface-200 bg-white p-3">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="text-sm font-semibold text-surface-900">{item.name}</Text>
                          {item.reason ? <Text className="mt-1 text-xs text-surface-500">{item.reason}</Text> : null}
                        </View>
                        <TouchableOpacity activeOpacity={0.86} onPress={() => removeBlockedUser(item.id)} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5">
                          <Text className="text-xs font-semibold text-red-600">{t('common.delete', { defaultValue: '삭제' })}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : null}

          {mode === 'customer-center' ? (
            <View>
              <View className="rounded-3xl border border-surface-200 bg-white p-4">
                {faqItems.map((item, index) => (
                  <View key={`${item.q}-${index}`} className={`${index > 0 ? 'mt-3 border-t border-surface-100 pt-3' : ''}`}>
                    <Text className="text-sm font-semibold text-surface-900">Q. {item.q}</Text>
                    <Text className="mt-1 text-sm text-surface-600">A. {item.a}</Text>
                  </View>
                ))}
              </View>

              <View className="mt-3 rounded-3xl border border-surface-200 bg-white p-4">
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={() => router.push(appRouteMap.report.path as never)}
                  className="rounded-xl bg-brand-600 px-3 py-3"
                >
                  <Text className="text-center text-sm font-semibold text-white">{t('settingsPage.app.contact', { defaultValue: '문의하기' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={handleOpenMail}
                  className="mt-2 rounded-xl border border-surface-200 bg-surface-50 px-3 py-3"
                >
                  <Text className="text-center text-sm font-semibold text-surface-700">support@divergram.com</Text>
                </TouchableOpacity>
                <View className="mt-2 flex-row">
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => router.push(appRouteMap.auth_terms.path as never)}
                    className="mr-2 flex-1 rounded-xl border border-surface-200 bg-white px-3 py-3"
                  >
                    <Text className="text-center text-xs font-semibold text-surface-700">{t('settingsPage.app.terms', { defaultValue: '이용약관' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => router.push(appRouteMap.auth_privacy.path as never)}
                    className="flex-1 rounded-xl border border-surface-200 bg-white px-3 py-3"
                  >
                    <Text className="text-center text-xs font-semibold text-surface-700">{t('settingsPage.app.privacyPolicy', { defaultValue: '개인정보처리방침' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}

          {mode === 'bottom-menu' ? (
            <View>
              <View className="rounded-3xl border border-surface-200 bg-white p-4">
                <Text className="text-sm font-semibold text-surface-900">{t('settingsPage.app.bottomMenuGuide', { defaultValue: '최소 3개, 최대 5개까지 선택할 수 있습니다.' })}</Text>
                <Text className="mt-1 text-xs text-surface-500">
                  {t('settingsPage.app.bottomMenuSelected', {
                    defaultValue: '선택됨 {{count}}/5',
                    count: menuDraft.length,
                  })}
                </Text>
              </View>

              <View className="mt-3 rounded-3xl border border-surface-200 bg-white p-2">
                {bottomTabCandidates.map((routeName, idx) => {
                  const active = menuDraft.includes(routeName);
                  const position = menuDraft.indexOf(routeName);
                  const movable = active && routeName !== 'index';
                  return (
                    <View
                      key={routeName}
                      className={`flex-row items-center px-2 py-2.5 ${idx > 0 ? 'border-t border-surface-100' : ''}`}
                    >
                      <View className="flex-1 pr-2">
                        <Text className="text-sm font-semibold text-surface-900">
                          {t(bottomTabTitleKeyMap[routeName], { defaultValue: routeName })}
                        </Text>
                        <Text className="mt-0.5 text-xs text-surface-500">
                          {active
                            ? t('settingsPage.app.bottomMenuOrder', { defaultValue: '하단 {{order}}번째', order: position + 1 })
                            : t('settingsPage.app.bottomMenuNotUsed', { defaultValue: '현재 하단 메뉴에서 숨김' })}
                        </Text>
                      </View>

                      {active ? (
                        <View className="mr-2 rounded-full bg-brand-50 px-2 py-1">
                          <Text className="text-xs font-semibold text-brand-700">ON</Text>
                        </View>
                      ) : null}

                      <TouchableOpacity
                        activeOpacity={0.86}
                        onPress={() => toggleBottomTab(routeName)}
                        className={`mr-2 rounded-lg border px-2.5 py-1.5 ${active ? 'border-red-200 bg-red-50' : 'border-brand-200 bg-brand-50'}`}
                      >
                        <Text className={`text-xs font-semibold ${active ? 'text-red-600' : 'text-brand-700'}`}>
                          {active ? t('common.delete', { defaultValue: '삭제' }) : t('common.add', { defaultValue: '추가' })}
                        </Text>
                      </TouchableOpacity>

                      <View className="flex-row">
                        <TouchableOpacity
                          activeOpacity={0.86}
                          disabled={!movable || position <= 0}
                          onPress={() => moveBottomTab(routeName, 'up')}
                          className={`mr-1 rounded-lg border px-2 py-1.5 ${movable && position > 0 ? 'border-surface-200 bg-white' : 'border-surface-200 bg-surface-100'}`}
                        >
                          <ArrowUp size={13} color={movable && position > 0 ? '#334155' : '#94a3b8'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.86}
                          disabled={!movable || position >= menuDraft.length - 1}
                          onPress={() => moveBottomTab(routeName, 'down')}
                          className={`rounded-lg border px-2 py-1.5 ${movable && position < menuDraft.length - 1 ? 'border-surface-200 bg-white' : 'border-surface-200 bg-surface-100'}`}
                        >
                          <ArrowDown size={13} color={movable && position < menuDraft.length - 1 ? '#334155' : '#94a3b8'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View className="mt-3 flex-row">
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={resetBottomMenu}
                  className="mr-2 flex-1 rounded-xl border border-surface-200 bg-white px-3 py-3"
                >
                  <Text className="text-center text-sm font-semibold text-surface-700">{t('common.reset', { defaultValue: '초기화' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.86} onPress={saveBottomMenu} className="flex-1 rounded-xl bg-brand-600 px-3 py-3">
                  <Text className="text-center text-sm font-semibold text-white">{t('pages.profileEdit.save', { defaultValue: '변경사항 저장' })}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {mode === 'emergency-contact' ? (
            <View className="rounded-3xl border border-surface-200 bg-white p-4">
              <Text className="mb-2 text-xs font-semibold text-surface-500">{t('settingsPage.safety.emergencyContact', { defaultValue: '비상 연락처 등록' })}</Text>
              <TextInput
                className={cardInputBaseClassName(false)}
                value={contactName}
                onChangeText={setContactName}
                placeholder={t('pages.profileEdit.name', { defaultValue: '이름' })}
                placeholderTextColor="#9ca3af"
              />
              <TextInput
                className={`${cardInputBaseClassName(false)} mt-2`}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                placeholder={t('settingsPage.profile.phoneVerify', { defaultValue: '휴대폰 번호' })}
                placeholderTextColor="#9ca3af"
              />
              <TextInput
                className={`${cardInputBaseClassName(false)} mt-2`}
                value={contactRelation}
                onChangeText={setContactRelation}
                placeholder={t('pages.account.security', { defaultValue: '관계 (예: 버디, 가족)' })}
                placeholderTextColor="#9ca3af"
              />
              <View className="mt-3 flex-row items-center justify-between rounded-xl border border-surface-200 bg-surface-50 px-3 py-3">
                <Text className="text-sm font-semibold text-surface-700">{t('settingsPage.safety.emergencyShare', { defaultValue: '긴급 상황 공유 설정' })}</Text>
                <Switch
                  value={emergencyShareEnabled}
                  onValueChange={(next) => updateSafetySetting('emergencyShareEnabled', next)}
                  trackColor={{ false: '#dbe3ec', true: '#0d5fa8' }}
                  thumbColor="#ffffff"
                />
              </View>
              <TouchableOpacity activeOpacity={0.86} onPress={handleSaveEmergencyContact} className="mt-3 rounded-xl bg-brand-600 px-3 py-3">
                <Text className="text-center text-sm font-semibold text-white">{t('pages.profileEdit.save', { defaultValue: '변경사항 저장' })}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {mode === 'safety-guide' ? (
            <View className="rounded-3xl border border-surface-200 bg-white p-4">
              {safetyGuideItems.map((item, index) => (
                <View key={`${item.title}-${index}`} className={`${index > 0 ? 'mt-3 border-t border-surface-100 pt-3' : ''}`}>
                  <Text className="text-sm font-semibold text-surface-900">{index + 1}. {item.title}</Text>
                  <Text className="mt-1 text-sm text-surface-600">{item.body}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {mode === 'insurance' ? (
            <View className="rounded-3xl border border-surface-200 bg-white p-4">
              <Text className="mb-2 text-xs font-semibold text-surface-500">{t('settingsPage.safety.insurance', { defaultValue: '보험 정보 등록' })}</Text>
              <TextInput
                className={cardInputBaseClassName(false)}
                value={insuranceProvider}
                onChangeText={setInsuranceProvider}
                placeholder={t('resorts.title', { defaultValue: '보험사 / 플랜명' })}
                placeholderTextColor="#9ca3af"
              />
              <TextInput
                className={`${cardInputBaseClassName(false)} mt-2`}
                value={insurancePolicyNumber}
                onChangeText={setInsurancePolicyNumber}
                placeholder={t('pages.profileEdit.license.number', { defaultValue: '증권 번호' })}
                placeholderTextColor="#9ca3af"
              />
              <TextInput
                className={`${cardInputBaseClassName(false)} mt-2`}
                value={insuranceEmergencyPhone}
                onChangeText={setInsuranceEmergencyPhone}
                keyboardType="phone-pad"
                placeholder={t('settingsPage.safety.emergencyContact', { defaultValue: '보험사 긴급 연락처' })}
                placeholderTextColor="#9ca3af"
              />
              <TextInput
                className={`${cardInputBaseClassName(false)} mt-2`}
                value={insuranceValidUntil}
                onChangeText={setInsuranceValidUntil}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity activeOpacity={0.86} onPress={handleSaveInsuranceInfo} className="mt-3 rounded-xl bg-brand-600 px-3 py-3">
                <Text className="text-center text-sm font-semibold text-white">{t('pages.profileEdit.save', { defaultValue: '변경사항 저장' })}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => router.back()}
            className="mt-3 rounded-xl border border-surface-200 bg-white px-3 py-3"
          >
            <Text className="text-center text-sm font-semibold text-surface-700">{t('common.back', { defaultValue: '뒤로가기' })}</Text>
          </TouchableOpacity>

          <View className="mt-5 flex-row items-center rounded-2xl border border-surface-200 bg-surface-50 px-3 py-3">
            <Link2 size={16} color="#5f7286" />
            <Text className="ml-2 flex-1 text-xs text-surface-500">{t('brand.tagline', { defaultValue: 'Real logs. Real ocean. Real divers.' })}</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
