import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../components/Screen';
import { getLatestPolicyVersionMap, getSignupConsentDefinition, refreshRemotePolicyDocuments } from '../../services/policyService';
import {
  clearPendingSignupDraft,
  getPendingSignupDraft,
  setPendingSignupConsents,
} from '../../services/signupFlowService';
import type { ConsentKey } from '../../models';
import { useLegalStore } from '../../stores/legalStore';
import { useAuth } from '../../hooks/useAuth';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { apiClient } from '../../lib/api';
import { normalizePolicyLocale } from '../../legal/policyCatalog';

const consentCopyKeys = [
  'requiredAlertTitle', 'requiredAlertBody', 'loginTitle', 'loginBody', 'doneTitle', 'doneBody',
  'missingTitle', 'missingBody', 'signupDone', 'signupDoneBody', 'saveFailed', 'signupFailed', 'unknown',
  'reconsent', 'signup', 'reconsentSubtitle', 'signupSubtitle', 'all', 'required', 'optional', 'requiredTag',
  'optionalTag', 'view', 'loading', 'processing', 'continue', 'enter', 'join',
] as const;

const routeByConsentKey: Partial<Record<ConsentKey, string>> = {
  terms_required: '/(auth)/terms',
  privacy_required: '/(auth)/privacy',
  location_required: '/(auth)/policy-document?type=location_terms',
  age14_required: '/(auth)/policy-document?type=age14_notice',
  marketing_optional: '/(auth)/policy-document?type=marketing_consent',
  push_optional: '/(auth)/policy-document?type=push_consent',
};

export default function ConsentScreen() {
  const { t, i18n } = useTranslation();
  const { isDark } = useResolvedTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; returnTo?: string | string[] }>();
  const mode = Array.isArray(params.mode) ? String(params.mode[0] || '') : String(params.mode || '');
  const returnToRaw = Array.isArray(params.returnTo) ? String(params.returnTo[0] || '') : String(params.returnTo || '');
  const returnTo = returnToRaw.startsWith('/') ? returnToRaw : '';
  const { signupWithEmail, signupWithSocialAccount, user } = useAuth();
  const registerConsents = useLegalStore((state) => state.registerConsents);
  const draft = getPendingSignupDraft();
  const isSignupIntroMode = mode === 'signup-intro';
  const isReconsentMode = mode === 'reconsent' || (!isSignupIntroMode && !draft && Boolean(user?.id));
  const locale = normalizePolicyLocale(i18n.resolvedLanguage || i18n.language);

  const [policyRevision, setPolicyRevision] = useState(0);
  const [policyLoading, setPolicyLoading] = useState(true);
  void policyRevision;
  const consentDef = getSignupConsentDefinition(locale);
  const [values, setValues] = useState<Record<ConsentKey, boolean>>({
    terms_required: false,
    privacy_required: false,
    location_required: false,
    age14_required: false,
    marketing_optional: false,
    push_optional: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    refreshRemotePolicyDocuments(locale)
      .then(() => { if (active) setPolicyRevision((value) => value + 1); })
      .catch(() => undefined)
      .finally(() => { if (active) setPolicyLoading(false); });
    return () => { active = false; };
  }, [locale]);

  const copy = Object.fromEntries(
    consentCopyKeys.map((key) => [key, t(`consentScreen.${key}`)])
  ) as Record<(typeof consentCopyKeys)[number], string>;

  const requiredOk = values.terms_required && values.privacy_required && values.age14_required;

  const visibleConsentKeys = [...consentDef.required, ...consentDef.optional].map((item) => item.key);
  const allChecked = visibleConsentKeys.every((key) => values[key]);
  const colors = {
    title: isDark ? '#F1F5F9' : '#0F172A',
    body: isDark ? '#A8B5C4' : '#64748B',
    cardBg: isDark ? '#0F1B2A' : '#FFFFFF',
    cardBorder: isDark ? '#2A3E52' : '#D7E4F1',
    rowBorder: isDark ? '#223345' : '#EDF2F7',
    rowTitle: isDark ? '#E2E8F0' : '#0F172A',
    sectionTitle: isDark ? '#CBD5E1' : '#334155',
  };

  const toggleAll = (next: boolean) => {
    setValues((previous) => {
      const updated = { ...previous, location_required: false };
      for (const key of visibleConsentKeys) updated[key] = next;
      return updated;
    });
  };

  const updateOne = (key: ConsentKey, next: boolean) => {
    setValues((prev) => ({ ...prev, [key]: next }));
  };

  const openDoc = (key: ConsentKey) => {
    const route = routeByConsentKey[key];
    if (route) router.push(route as never);
  };

  const submit = async () => {
    if (!requiredOk) {
      Alert.alert(copy.requiredAlertTitle, copy.requiredAlertBody);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const versionMap = getLatestPolicyVersionMap(locale);
      const receipts = [...consentDef.required, ...consentDef.optional].map(({ key, policy }) => ({
        key,
        policyType: policy.type,
        version: policy.version,
        agreed: values[key],
      }));
      if (isSignupIntroMode) {
        setPendingSignupConsents(receipts);
        router.replace('/(auth)/login?mode=signup&consent=ready');
        return;
      }
      if (isReconsentMode) {
        if (!user?.id) {
          Alert.alert(copy.loginTitle, copy.loginBody);
          router.replace('/(auth)/login');
          return;
        }
        await apiClient.saveSignupConsents(receipts, locale);
        registerConsents({
          userId: user.id,
          values,
          versionMap,
        });
        Alert.alert(copy.doneTitle, copy.doneBody);
        router.replace((returnTo || '/(tabs)/feed') as never);
        return;
      }

      if (!draft) {
        Alert.alert(copy.missingTitle, copy.missingBody);
        router.replace('/(auth)/login');
        return;
      }

      let createdUser = null;
      if (draft.kind === 'social') {
        const outcome = await signupWithSocialAccount(draft, receipts);
        createdUser = outcome.user || null;
      } else {
        createdUser = await signupWithEmail(draft.email, draft.password, draft.name, draft.contact, receipts);
      }
      const targetUserId = createdUser?.id || user?.id || `signup:${draft.kind === 'email' ? draft.email : draft.providerUserId || draft.provider}`;
      registerConsents({
        userId: targetUserId,
        values,
        versionMap,
      });
      clearPendingSignupDraft();
      Alert.alert(copy.signupDone, copy.signupDoneBody);
      router.replace('/(tabs)/profile-edit');
    } catch (error: any) {
      Alert.alert(isReconsentMode ? copy.saveFailed : copy.signupFailed, String(error?.message || copy.unknown));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <Text style={{ fontSize: 27, fontWeight: '800', color: colors.title }}>{isReconsentMode ? copy.reconsent : copy.signup}</Text>
        <Text style={{ marginTop: 8, color: colors.body }}>
          {isReconsentMode ? copy.reconsentSubtitle : copy.signupSubtitle}
        </Text>

        <View style={{ marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.rowTitle, fontWeight: '800' }}>{copy.all}</Text>
            <Switch value={allChecked} onValueChange={toggleAll} trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }} thumbColor="#fff" />
          </View>
        </View>

        <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 12 }}>
          <Text style={{ marginBottom: 8, color: colors.sectionTitle, fontWeight: '700' }}>{copy.required}</Text>
          {consentDef.required.map((item, idx) => (
            <View key={item.key} style={{ paddingVertical: 10, borderBottomWidth: idx === consentDef.required.length - 1 ? 0 : 1, borderBottomColor: colors.rowBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.rowTitle, flex: 1 }}>[{copy.requiredTag}] {item.policy.title}</Text>
                <Switch value={values[item.key]} onValueChange={(next) => updateOne(item.key, next)} trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }} thumbColor="#fff" />
              </View>
              <TouchableOpacity onPress={() => openDoc(item.key)} style={{ marginTop: 6 }}>
                <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{copy.view}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg, padding: 12 }}>
          <Text style={{ marginBottom: 8, color: colors.sectionTitle, fontWeight: '700' }}>{copy.optional}</Text>
          {consentDef.optional.map((item, idx) => (
            <View key={item.key} style={{ paddingVertical: 10, borderBottomWidth: idx === consentDef.optional.length - 1 ? 0 : 1, borderBottomColor: colors.rowBorder }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.rowTitle, flex: 1 }}>[{copy.optionalTag}] {item.policy.title}</Text>
                <Switch value={values[item.key]} onValueChange={(next) => updateOne(item.key, next)} trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }} thumbColor="#fff" />
              </View>
              <TouchableOpacity onPress={() => openDoc(item.key)} style={{ marginTop: 6 }}>
                <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{copy.view}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={{ marginTop: 16, borderRadius: 12, backgroundColor: requiredOk && !submitting ? '#0D5FA8' : '#94A3B8', paddingVertical: 13, alignItems: 'center' }}
          disabled={!requiredOk || submitting || policyLoading}
          onPress={submit}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            {policyLoading
              ? copy.loading
              : submitting
                ? copy.processing
                : isReconsentMode
                  ? copy.continue
                  : isSignupIntroMode
                    ? copy.enter
                    : copy.join}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
