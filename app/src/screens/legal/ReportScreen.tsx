import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../hooks/useAuth';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import type { ReportReason, ReportTargetType, ReportStatus } from '../../models';
import { useLegalStore } from '../../stores/legalStore';
import { apiClient } from '../../lib/api';
import { normalizePolicyLocale } from '../../legal/policyCatalog';
import { getLatestPolicyVersionMap } from '../../services/policyService';
import { useTranslation } from 'react-i18next';

const targetOptions: ReportTargetType[] = ['user', 'post', 'comment', 'dive_log', 'media'];

const reasonOptions: ReportReason[] = ['sexual_content', 'violence', 'hate', 'misinformation', 'dangerous_behavior', 'copyright', 'impersonation', 'spam'];

const detailMinLengthByReason: Partial<Record<ReportReason, number>> = {
  misinformation: 8,
  dangerous_behavior: 10,
  copyright: 12,
  impersonation: 6,
};
const MAX_DETAIL_LENGTH = 1000;
const reportStatusColorMap: Record<ReportStatus, string> = {
  received: '#334155',
  reviewing: '#1D4ED8',
  resolved: '#166534',
  rejected: '#B91C1C',
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

function formatReportError(error: any, t: Translate) {
  const message = String(error?.message || error || '');
  if (message.includes('duplicate_report_recent')) {
    return t('reportScreen.errors.duplicate');
  }
  if (message.includes('invalid_report_target_type')) {
    return t('reportScreen.errors.invalidTarget');
  }
  if (message.includes('invalid_report_reason')) {
    return t('reportScreen.errors.invalidReason');
  }
  return message || t('reportScreen.errors.unknown');
}

function shouldQueueReportSync(error: any) {
  const status = Number(error?.response?.status || 0);
  if (!status) return true;
  if (status >= 500) return true;
  if (status === 408 || status === 429) return true;
  return false;
}

function validateTargetIdByType(targetType: ReportTargetType, targetId: string, t: Translate) {
  const value = targetId.trim();
  if (value.length < 2) return t('reportScreen.errors.targetRequired');
  if (value.length > 64) return t('reportScreen.errors.targetTooLong');
  if (/\s/.test(value)) return t('reportScreen.errors.targetWhitespace');
  if (!/^[A-Za-z0-9_:\-]+$/.test(value)) return t('reportScreen.errors.targetCharacters');
  if (targetType === 'user' && value.length < 1) return t('reportScreen.errors.userRequired');
  if (targetType !== 'user' && value.length < 3) return t('reportScreen.errors.targetTooShort');
  return '';
}

function normalizeTargetId(value: string) {
  return value.trim().toLowerCase();
}

function requiredDetailLength(reason: ReportReason) {
  return detailMinLengthByReason[reason] || 0;
}

function validateDetailQuality(reason: ReportReason, detailText: string, t: Translate) {
  const detail = detailText.trim();
  if (!detail) return '';
  if (/(.)\1{7,}/.test(detail.replace(/\s+/g, ''))) {
    return t('reportScreen.errors.repeatedCharacters');
  }
  if (!/[0-9A-Za-z\u3131-\u318E\uAC00-\uD7A3]/.test(detail)) {
    return t('reportScreen.errors.identifiableCharacters');
  }
  if (reason === 'copyright') {
    const hasLink = /(https?:\/\/|www\.)/i.test(detail);
    if (!hasLink && detail.length < 24) {
      return t('reportScreen.errors.copyrightDetail');
    }
  }
  return '';
}

export default function ReportScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark } = useResolvedTheme();
  const params = useLocalSearchParams<{ postId?: string; reportedUserId?: string; targetType?: string }>();
  const submitReport = useLegalStore((state) => state.submitReport);
  const markReportSyncStatus = useLegalStore((state) => state.markReportSyncStatus);
  const advanceReportWorkflow = useLegalStore((state) => state.advanceReportWorkflow);
  const hasRequiredSignupConsents = useLegalStore((state) => state.hasRequiredSignupConsents);
  const reportHistory = useLegalStore((state) => state.reports);
  const latestPolicyVersionMap = useMemo(
    () => getLatestPolicyVersionMap(normalizePolicyLocale(i18n.resolvedLanguage || i18n.language)),
    [i18n.language, i18n.resolvedLanguage]
  );

  const initialTargetType = useMemo<ReportTargetType>(() => {
    const raw = String(params.targetType || '').trim();
    if (targetOptions.includes(raw as ReportTargetType)) return raw as ReportTargetType;
    if (params.postId) return 'post';
    if (params.reportedUserId) return 'user';
    return 'post';
  }, [params.postId, params.reportedUserId, params.targetType]);

  const initialTargetId = useMemo(() => {
    if (initialTargetType === 'post') return String(params.postId || '').trim();
    if (initialTargetType === 'user') return String(params.reportedUserId || '').trim();
    return '';
  }, [initialTargetType, params.postId, params.reportedUserId]);

  const [targetType, setTargetType] = useState<ReportTargetType>(initialTargetType);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [reason, setReason] = useState<ReportReason>('misinformation');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [syncingReportId, setSyncingReportId] = useState<string>('');
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number>(0);
  const [autoSyncDone, setAutoSyncDone] = useState(false);
  const hasLegalConsentForReport = useMemo(
    () => (user?.id ? hasRequiredSignupConsents(user.id, latestPolicyVersionMap) : false),
    [hasRequiredSignupConsents, latestPolicyVersionMap, user?.id]
  );

  const myRecentReports = useMemo(
    () => reportHistory.filter((item) => item.reporterUserId === user?.id).slice(0, 3),
    [reportHistory, user?.id]
  );
  const myPendingReports = useMemo(
    () =>
      reportHistory
        .filter((item) => item.reporterUserId === user?.id && item.syncStatus !== 'synced')
        .slice(0, 5),
    [reportHistory, user?.id]
  );

  const targetIdError = useMemo(() => validateTargetIdByType(targetType, targetId, t), [t, targetId, targetType]);
  const detailError = useMemo(() => {
    if (detail.length > MAX_DETAIL_LENGTH) return t('reportScreen.errors.detailTooLong', { count: MAX_DETAIL_LENGTH });
    const minLength = requiredDetailLength(reason);
    if (!minLength) return '';
    if (detail.trim().length < minLength) {
      return t('reportScreen.errors.detailRequired', { count: minLength });
    }
    return validateDetailQuality(reason, detail, t) || '';
  }, [detail, reason, t]);

  const optionalDetailError = useMemo(() => {
    if (requiredDetailLength(reason) > 0) return '';
    if (detail.length > MAX_DETAIL_LENGTH) return t('reportScreen.errors.detailTooLong', { count: MAX_DETAIL_LENGTH });
    return validateDetailQuality(reason, detail, t);
  }, [detail, reason, t]);
  const canSubmit = Boolean(reason) && !submitting && !targetIdError && !detailError && !optionalDetailError;
  const colors = useMemo(
    () => ({
      title: isDark ? '#F1F5F9' : '#0F172A',
      subtitle: isDark ? '#9FB3C8' : '#64748B',
      sectionTitle: isDark ? '#CBD5E1' : '#334155',
      chipBorder: isDark ? '#2A3E52' : '#CBD5E1',
      chipBg: isDark ? '#0F1B2A' : '#ffffff',
      chipText: isDark ? '#CBD5E1' : '#334155',
      inputBg: isDark ? '#0F1B2A' : '#ffffff',
      inputBorder: isDark ? '#2A3E52' : '#CBD5E1',
      inputText: isDark ? '#E2E8F0' : '#0F172A',
      previewBg: isDark ? '#0F1B2A' : '#F8FBFF',
      previewBorder: isDark ? '#2A3E52' : '#D9E4F1',
      previewTitle: isDark ? '#E2E8F0' : '#0F172A',
      previewText: isDark ? '#B6C6D8' : '#475569',
      historyBg: isDark ? '#0F1B2A' : '#ffffff',
      historyBorder: isDark ? '#2A3E52' : '#D9E4F1',
    }),
    [isDark]
  );

  useEffect(() => {
    if (hasLegalConsentForReport) {
      setAutoSyncDone(false);
    }
  }, [hasLegalConsentForReport, user?.id]);

  const validateBeforeSubmit = () => {
    if (targetIdError) return targetIdError;
    if (detailError) return detailError;
    if (optionalDetailError) return optionalDetailError;
    const normalizedTargetId = normalizeTargetId(targetId);
    const duplicateRecent = reportHistory.find((item) => {
      if (item.reporterUserId !== user?.id) return false;
      if (item.targetType !== targetType) return false;
      if (normalizeTargetId(item.targetId) !== normalizedTargetId) return false;
      if (item.reason !== reason) return false;
      const createdMs = Date.parse(String(item.createdAt || ''));
      if (!Number.isFinite(createdMs)) return false;
      return Date.now() - createdMs < 10 * 60 * 1000;
    });
    if (duplicateRecent) {
      return t('reportScreen.errors.recentDuplicate');
    }
    const anyRecentSameTarget = reportHistory.find((item) => {
      if (item.reporterUserId !== user?.id) return false;
      if (item.targetType !== targetType) return false;
      if (normalizeTargetId(item.targetId) !== normalizedTargetId) return false;
      const createdMs = Date.parse(String(item.createdAt || ''));
      if (!Number.isFinite(createdMs)) return false;
      return Date.now() - createdMs < 30 * 1000;
    });
    if (anyRecentSameTarget) {
      return t('reportScreen.errors.targetCooldown');
    }
    const dailyCount = reportHistory.filter((item) => {
      if (item.reporterUserId !== user?.id) return false;
      const createdMs = Date.parse(String(item.createdAt || ''));
      if (!Number.isFinite(createdMs)) return false;
      return Date.now() - createdMs < 24 * 60 * 60 * 1000;
    }).length;
    if (dailyCount >= 20) {
      return t('reportScreen.errors.dailyLimit');
    }
    if (Date.now() - lastSubmittedAt < 3500) {
      return t('reportScreen.errors.submitCooldown');
    }
    if (targetType === 'user') {
      const selfId = normalizeTargetId(String(user?.id || ''));
      if (selfId && normalizedTargetId === selfId) {
        return t('reportScreen.errors.selfReport');
      }
    }
    return '';
  };

  const onSubmit = async () => {
    if (!user?.id) {
      Alert.alert(t('reportScreen.loginRequired'), t('reportScreen.loginRequiredBody'));
      return;
    }
    if (!hasLegalConsentForReport) {
      Alert.alert(t('reportScreen.consentRequired'), t('reportScreen.consentRequiredBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('reportScreen.goToConsent'),
          onPress: () =>
            router.push(`/(auth)/consent?mode=reconsent&returnTo=${encodeURIComponent('/(tabs)/report')}` as never),
        },
      ]);
      return;
    }
    if (!canSubmit) return;
    const validationError = validateBeforeSubmit();
    if (validationError) {
      Alert.alert(t('reportScreen.checkInput'), validationError);
      return;
    }
    const normalizedTargetId = targetId.trim();

    setSubmitting(true);
    let localReportId = '';
    try {
      const localReport = submitReport({
        reporterUserId: user.id,
        targetType,
        targetId: normalizedTargetId,
        reason,
        detail: detail.trim() || undefined,
      });
      localReportId = localReport.id;

      await apiClient.submitModerationReport({
        targetType,
        targetId: normalizedTargetId,
        reason,
        detail: detail.trim() || undefined,
        userId: user.id,
      });
      markReportSyncStatus(localReportId, 'synced');
      setLastSubmittedAt(Date.now());

      Alert.alert(t('reportScreen.submitted'), t('reportScreen.submittedBody'), [
        { text: t('common.confirm'), onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (localReportId && shouldQueueReportSync(error)) {
        markReportSyncStatus(localReportId, 'pending', formatReportError(error, t));
        setLastSubmittedAt(Date.now());
        Alert.alert(
          t('reportScreen.queued'),
          t('reportScreen.queuedBody'),
          [{ text: t('common.confirm'), onPress: () => router.back() }]
        );
        return;
      }
      if (localReportId) {
        markReportSyncStatus(localReportId, 'failed', formatReportError(error, t));
      }
      Alert.alert(t('reportScreen.submitFailed'), formatReportError(error, t));
    } finally {
      setSubmitting(false);
    }
  };

  const retryPendingReport = async (reportId: string) => {
    const report = reportHistory.find((item) => item.id === reportId);
    if (!report || !user?.id) return;
    if (!hasLegalConsentForReport) {
      Alert.alert(t('reportScreen.consentRequired'), t('reportScreen.retryConsentBody'));
      return;
    }
    setSyncingReportId(reportId);
    try {
      await apiClient.submitModerationReport({
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        detail: report.detail,
        userId: user.id,
      });
      markReportSyncStatus(reportId, 'synced');
      Alert.alert(t('reportScreen.syncComplete'), t('reportScreen.syncCompleteBody'));
    } catch (error: any) {
      const pending = shouldQueueReportSync(error);
      markReportSyncStatus(reportId, pending ? 'pending' : 'failed', formatReportError(error, t));
      Alert.alert(t('reportScreen.syncFailed'), formatReportError(error, t));
    } finally {
      setSyncingReportId('');
    }
  };

  useEffect(() => {
    if (!user?.id || autoSyncDone) return;
    if (!hasLegalConsentForReport) {
      setAutoSyncDone(true);
      return;
    }
    const pendingTargets = reportHistory
      .filter((item) => item.reporterUserId === user.id && item.syncStatus !== 'synced')
      .slice(0, 3);
    if (!pendingTargets.length) {
      setAutoSyncDone(true);
      return;
    }

    let cancelled = false;
    const runAutoSync = async () => {
      for (const item of pendingTargets) {
        try {
          await apiClient.submitModerationReport({
            targetType: item.targetType,
            targetId: item.targetId,
            reason: item.reason,
            detail: item.detail,
            userId: user.id,
          });
          if (!cancelled) markReportSyncStatus(item.id, 'synced');
        } catch (error: any) {
          if (cancelled) continue;
          const pending = shouldQueueReportSync(error);
          markReportSyncStatus(item.id, pending ? 'pending' : 'failed', formatReportError(error, t));
        }
      }
      if (!cancelled) setAutoSyncDone(true);
    };

    runAutoSync();
    return () => {
      cancelled = true;
    };
  }, [autoSyncDone, hasLegalConsentForReport, markReportSyncStatus, reportHistory, t, user?.id]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <Text style={{ fontSize: 27, fontWeight: '800', color: colors.title }}>{t('reportScreen.title')}</Text>
        <Text style={{ marginTop: 8, color: colors.subtitle }}>{t('reportScreen.subtitle')}</Text>

        <View style={{ marginTop: 16 }}>
          <Text style={{ marginBottom: 8, color: colors.sectionTitle, fontWeight: '700' }}>{t('reportScreen.target')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {targetOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => {
                  setTargetType(item);
                  if (item !== targetType) setTargetId('');
                }}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: targetType === item ? '#0D5FA8' : colors.chipBorder, backgroundColor: targetType === item ? '#EAF4FF' : colors.chipBg, paddingHorizontal: 13, paddingVertical: 8 }}
              >
                <Text style={{ color: targetType === item ? '#0D5FA8' : colors.chipText, fontWeight: '700' }}>{t(`reportScreen.targets.${item}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ marginBottom: 8, color: colors.sectionTitle, fontWeight: '700' }}>{t('reportScreen.targetId')}</Text>
          <TextInput value={targetId} onChangeText={setTargetId} placeholder={t(`reportScreen.targetPlaceholders.${targetType}`)} placeholderTextColor="#94A3B8" style={{ borderWidth: 1, borderColor: targetIdError ? '#FCA5A5' : colors.inputBorder, borderRadius: 12, backgroundColor: colors.inputBg, color: colors.inputText, padding: 12 }} />
          {targetIdError ? <Text style={{ marginTop: 6, color: '#B91C1C', fontSize: 12 }}>{targetIdError}</Text> : null}
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ marginBottom: 8, color: colors.sectionTitle, fontWeight: '700' }}>{t('reportScreen.reason')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {reasonOptions.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setReason(item)}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: reason === item ? '#0D5FA8' : colors.chipBorder, backgroundColor: reason === item ? '#EAF4FF' : colors.chipBg, paddingHorizontal: 13, paddingVertical: 8 }}
              >
                <Text style={{ color: reason === item ? '#0D5FA8' : colors.chipText, fontWeight: '700' }}>{t(`reportScreen.reasons.${item}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ marginBottom: 8, color: colors.sectionTitle, fontWeight: '700' }}>{t('reportScreen.detailsOptional')}</Text>
          <TextInput
            value={detail}
            onChangeText={(next) => setDetail(next.slice(0, MAX_DETAIL_LENGTH))}
            multiline
            textAlignVertical="top"
            placeholder={t('reportScreen.detailsPlaceholder')}
            placeholderTextColor="#94A3B8"
            style={{ borderWidth: 1, borderColor: detailError || optionalDetailError ? '#FCA5A5' : colors.inputBorder, borderRadius: 12, backgroundColor: colors.inputBg, color: colors.inputText, padding: 12, minHeight: 120 }}
          />
          <Text style={{ marginTop: 4, color: '#94A3B8', fontSize: 12, textAlign: 'right' }}>{detail.length}/{MAX_DETAIL_LENGTH}</Text>
          {requiredDetailLength(reason) > 0 ? (
            <Text style={{ marginTop: 6, color: detailError ? '#B91C1C' : '#B45309', fontSize: 12 }}>
              {detailError || t('reportScreen.detailRequiredHint', { count: requiredDetailLength(reason) })}
            </Text>
          ) : optionalDetailError ? (
            <Text style={{ marginTop: 6, color: '#B91C1C', fontSize: 12 }}>{optionalDetailError}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.previewBorder, backgroundColor: colors.previewBg, padding: 12 }}>
          <Text style={{ color: colors.previewTitle, fontWeight: '700' }}>{t('reportScreen.preview')}</Text>
          <Text style={{ marginTop: 6, color: colors.previewText }}>{t('reportScreen.target')}: {t(`reportScreen.targets.${targetType}`)} / {targetId.trim() || '-'}</Text>
          <Text style={{ marginTop: 2, color: colors.previewText }}>{t('reportScreen.reason')}: {t(`reportScreen.reasons.${reason}`)}</Text>
          <Text style={{ marginTop: 2, color: colors.subtitle }}>{t('reportScreen.details')}: {detail.trim() || t('reportScreen.none')}</Text>
        </View>

        {myPendingReports.length ? (
          <View style={{ marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFFBEB', padding: 12 }}>
            <Text style={{ color: '#9A3412', fontWeight: '800' }}>{t('reportScreen.pendingReports', { count: myPendingReports.length })}</Text>
            {myPendingReports.map((item) => (
              <View key={item.id} style={{ marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FDBA74', backgroundColor: colors.chipBg, padding: 10 }}>
                <Text style={{ color: '#7C2D12', fontWeight: '700' }}>
                  {item.targetType} / {item.targetId}
                </Text>
                <Text style={{ marginTop: 2, color: '#9A3412', fontSize: 12 }}>
                  {t('reportScreen.status')}: {t(item.syncStatus === 'failed' ? 'reportScreen.failed' : 'reportScreen.pending')}{item.syncError ? ` · ${item.syncError}` : ''}
                </Text>
                <TouchableOpacity
                  onPress={() => retryPendingReport(item.id)}
                  disabled={syncingReportId === item.id}
                  style={{
                    marginTop: 8,
                    alignSelf: 'flex-start',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: syncingReportId === item.id ? '#E2E8F0' : '#F59E0B',
                    backgroundColor: syncingReportId === item.id ? '#F8FAFC' : '#FEF3C7',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: syncingReportId === item.id ? '#94A3B8' : '#92400E', fontWeight: '700', fontSize: 12 }}>
                    {t(syncingReportId === item.id ? 'reportScreen.syncing' : 'reportScreen.syncNow')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        <TouchableOpacity
          style={{ marginTop: 16, borderRadius: 12, backgroundColor: canSubmit ? '#0D5FA8' : '#94A3B8', paddingVertical: 13, alignItems: 'center' }}
          disabled={!canSubmit}
          onPress={onSubmit}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>{t(submitting ? 'reportScreen.processing' : 'reportScreen.submit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(tabs)/community-policy' as never)} style={{ marginTop: 12 }}>
          <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>{t('reportScreen.viewPolicy')}</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.historyBorder, backgroundColor: colors.historyBg, padding: 12 }}>
          <Text style={{ color: colors.title, fontWeight: '700' }}>{t('reportScreen.recentHistory')}</Text>
          {myRecentReports.length === 0 ? (
            <Text style={{ marginTop: 6, color: colors.subtitle }}>{t('reportScreen.noHistory')}</Text>
          ) : (
            myRecentReports.map((item) => (
              <View key={item.id} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colors.sectionTitle, fontWeight: '700' }}>
                    {item.targetType} / {item.targetId}
                  </Text>
                  <Text style={{ color: reportStatusColorMap[item.status], fontWeight: '800', fontSize: 12 }}>
                    {t(`reportScreen.statuses.${item.status}`)}
                  </Text>
                </View>
                <Text style={{ marginTop: 2, color: '#64748B' }}>{item.reason}</Text>
                {item.resolutionNote ? <Text style={{ marginTop: 2, color: '#0F766E', fontSize: 12 }}>{item.resolutionNote}</Text> : null}
                <Text style={{ marginTop: 2, color: '#94A3B8', fontSize: 12 }}>{item.createdAt}</Text>
                {item.status !== 'resolved' && item.status !== 'rejected' ? (
                  <TouchableOpacity
                    onPress={() => {
                      const result = advanceReportWorkflow(item.id);
                      if (!result.ok) {
                        Alert.alert(t('reportScreen.notice'), result.message || t('reportScreen.unavailableState'));
                        return;
                      }
                    }}
                    style={{
                      marginTop: 6,
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#CBD5E1',
                      backgroundColor: '#F8FAFC',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: '#334155', fontWeight: '700', fontSize: 12 }}>{t('reportScreen.advanceReviewMock')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
