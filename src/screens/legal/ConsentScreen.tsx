import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { getLatestPolicyVersionMap, getSignupConsentDefinition } from '../../services/policyService';
import { clearPendingSignupDraft, getPendingSignupDraft } from '../../services/signupFlowService';
import type { ConsentKey } from '../../models';
import { useLegalStore } from '../../stores/legalStore';
import { useAuth } from '../../hooks/useAuth';

const routeByConsentKey: Partial<Record<ConsentKey, string>> = {
  terms_required: '/(auth)/terms',
  privacy_required: '/(auth)/privacy',
  location_required: '/(auth)/policy-document?type=location_terms',
  age14_required: '/(auth)/policy-document?type=age14_notice',
  marketing_optional: '/(auth)/policy-document?type=marketing_consent',
  push_optional: '/(auth)/policy-document?type=push_consent',
};

export default function ConsentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[]; returnTo?: string | string[] }>();
  const mode = Array.isArray(params.mode) ? String(params.mode[0] || '') : String(params.mode || '');
  const returnToRaw = Array.isArray(params.returnTo) ? String(params.returnTo[0] || '') : String(params.returnTo || '');
  const returnTo = returnToRaw.startsWith('/') ? returnToRaw : '';
  const { signupWithEmail, user } = useAuth();
  const registerConsents = useLegalStore((state) => state.registerConsents);
  const draft = getPendingSignupDraft();
  const isReconsentMode = mode === 'reconsent' || (!draft && Boolean(user?.id));

  const consentDef = useMemo(() => getSignupConsentDefinition('ko'), []);
  const [values, setValues] = useState<Record<ConsentKey, boolean>>({
    terms_required: false,
    privacy_required: false,
    location_required: false,
    age14_required: false,
    marketing_optional: false,
    push_optional: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const requiredOk =
    values.terms_required && values.privacy_required && values.location_required && values.age14_required;

  const allChecked = Object.values(values).every(Boolean);

  const toggleAll = (next: boolean) => {
    setValues({
      terms_required: next,
      privacy_required: next,
      location_required: next,
      age14_required: next,
      marketing_optional: next,
      push_optional: next,
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
      Alert.alert('필수 동의 필요', '필수 약관에 모두 동의해야 회원가입할 수 있습니다.');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const versionMap = getLatestPolicyVersionMap('ko');
      if (isReconsentMode) {
        if (!user?.id) {
          Alert.alert('로그인 필요', '다시 로그인 후 동의를 진행해주세요.');
          router.replace('/(auth)/login');
          return;
        }
        registerConsents({
          userId: user.id,
          values,
          versionMap,
        });
        Alert.alert('동의 완료', '최신 약관 동의가 저장되었습니다.');
        router.replace((returnTo || '/(tabs)/feed') as never);
        return;
      }

      if (!draft) {
        Alert.alert('회원가입 정보 없음', '다시 회원가입을 진행해주세요.');
        router.replace('/(auth)/login');
        return;
      }

      const createdUser = await signupWithEmail(draft.email, draft.password, draft.name, draft.contact);
      const targetUserId = createdUser?.id || user?.id || `signup:${draft.email}`;
      registerConsents({
        userId: targetUserId,
        values,
        versionMap,
      });
      clearPendingSignupDraft();
      Alert.alert('회원가입 완료', '동의 이력이 저장되었습니다.');
      router.replace('/(tabs)/feed');
    } catch (error: any) {
      Alert.alert(isReconsentMode ? '동의 저장 실패' : '회원가입 실패', String(error?.message || '알 수 없는 오류'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <Text style={{ fontSize: 27, fontWeight: '800', color: '#0F172A' }}>{isReconsentMode ? '정책 재동의' : '회원가입 동의'}</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>
          {isReconsentMode ? '서비스 이용을 위해 최신 정책 동의가 필요합니다.' : '필수 약관 동의 후 회원가입을 진행할 수 있습니다.'}
        </Text>

        <View style={{ marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#0F172A', fontWeight: '800' }}>전체 동의</Text>
            <Switch value={allChecked} onValueChange={toggleAll} trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }} thumbColor="#fff" />
          </View>
        </View>

        <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 12 }}>
          <Text style={{ marginBottom: 8, color: '#334155', fontWeight: '700' }}>필수 동의</Text>
          {consentDef.required.map((item, idx) => (
            <View key={item.key} style={{ paddingVertical: 10, borderBottomWidth: idx === consentDef.required.length - 1 ? 0 : 1, borderBottomColor: '#EDF2F7' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#0F172A', flex: 1 }}>[필수] {item.policy.title}</Text>
                <Switch value={values[item.key]} onValueChange={(next) => updateOne(item.key, next)} trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }} thumbColor="#fff" />
              </View>
              <TouchableOpacity onPress={() => openDoc(item.key)} style={{ marginTop: 6 }}>
                <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>내용 보기</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 12 }}>
          <Text style={{ marginBottom: 8, color: '#334155', fontWeight: '700' }}>선택 동의</Text>
          {consentDef.optional.map((item, idx) => (
            <View key={item.key} style={{ paddingVertical: 10, borderBottomWidth: idx === consentDef.optional.length - 1 ? 0 : 1, borderBottomColor: '#EDF2F7' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#0F172A', flex: 1 }}>[선택] {item.policy.title}</Text>
                <Switch value={values[item.key]} onValueChange={(next) => updateOne(item.key, next)} trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }} thumbColor="#fff" />
              </View>
              <TouchableOpacity onPress={() => openDoc(item.key)} style={{ marginTop: 6 }}>
                <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>내용 보기</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={{ marginTop: 16, borderRadius: 12, backgroundColor: requiredOk && !submitting ? '#0D5FA8' : '#94A3B8', paddingVertical: 13, alignItems: 'center' }}
          disabled={!requiredOk || submitting}
          onPress={submit}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            {submitting ? '처리중...' : isReconsentMode ? '동의하고 계속하기' : '동의하고 가입하기'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
