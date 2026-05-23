import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../hooks/useAuth';
import type { ReportReason, ReportTargetType, ReportStatus } from '../../models';
import { useLegalStore } from '../../stores/legalStore';
import { apiClient } from '../../lib/api';

const targetOptions: { key: ReportTargetType; label: string }[] = [
  { key: 'user', label: '사용자' },
  { key: 'post', label: '게시글' },
  { key: 'comment', label: '댓글' },
  { key: 'dive_log', label: 'DiveLog' },
  { key: 'media', label: '사진/영상' },
];

const reasonOptions: { key: ReportReason; label: string }[] = [
  { key: 'sexual_content', label: '음란물' },
  { key: 'violence', label: '폭력성' },
  { key: 'hate', label: '혐오 표현' },
  { key: 'misinformation', label: '허위 정보' },
  { key: 'dangerous_behavior', label: '위험 행위 조장' },
  { key: 'copyright', label: '저작권 침해' },
  { key: 'impersonation', label: '사칭' },
  { key: 'spam', label: '스팸' },
];

const detailMinLengthByReason: Partial<Record<ReportReason, number>> = {
  misinformation: 8,
  dangerous_behavior: 10,
  copyright: 12,
  impersonation: 6,
};
const MAX_DETAIL_LENGTH = 1000;
const targetIdPlaceholderMap: Record<ReportTargetType, string> = {
  user: '사용자 ID (예: user_123)',
  post: '게시글 ID (예: post_456)',
  comment: '댓글 ID (예: cmt_789)',
  dive_log: 'DiveLog ID (예: log_001)',
  media: '미디어 ID (예: media_321)',
};

const reportStatusLabelMap: Record<ReportStatus, string> = {
  received: '접수됨',
  reviewing: '검토중',
  resolved: '처리완료',
  rejected: '반려',
};

const reportStatusColorMap: Record<ReportStatus, string> = {
  received: '#334155',
  reviewing: '#1D4ED8',
  resolved: '#166534',
  rejected: '#B91C1C',
};

function formatReportError(error: any) {
  const message = String(error?.message || error || '');
  if (message.includes('duplicate_report_recent')) {
    return '동일 대상/사유 신고가 이미 접수되었습니다. 잠시 후 다시 시도해주세요.';
  }
  if (message.includes('invalid_report_target_type')) {
    return '지원하지 않는 신고 대상입니다.';
  }
  if (message.includes('invalid_report_reason')) {
    return '지원하지 않는 신고 사유입니다.';
  }
  return message || '알 수 없는 오류';
}

function shouldQueueReportSync(error: any) {
  const status = Number(error?.response?.status || 0);
  if (!status) return true;
  if (status >= 500) return true;
  if (status === 408 || status === 429) return true;
  return false;
}

function validateTargetIdByType(targetType: ReportTargetType, targetId: string) {
  const value = targetId.trim();
  if (value.length < 2) return '대상 ID를 입력해주세요.';
  if (value.length > 64) return '대상 ID는 64자 이내로 입력해주세요.';
  if (/\s/.test(value)) return '대상 ID에는 공백을 사용할 수 없습니다.';
  if (!/^[A-Za-z0-9_:\-]+$/.test(value)) return '대상 ID는 영문/숫자/언더스코어/하이픈/콜론만 사용할 수 있습니다.';
  if (targetType === 'user' && value.length < 4) return '사용자 ID는 4자 이상 입력해주세요.';
  if (targetType !== 'user' && value.length < 3) return '대상 ID는 3자 이상 입력해주세요.';
  return '';
}

function normalizeTargetId(value: string) {
  return value.trim().toLowerCase();
}

function requiredDetailLength(reason: ReportReason) {
  return detailMinLengthByReason[reason] || 0;
}

function validateDetailQuality(reason: ReportReason, detailText: string) {
  const detail = detailText.trim();
  if (!detail) return '';
  if (/(.)\1{7,}/.test(detail.replace(/\s+/g, ''))) {
    return '동일 문자 반복이 과도합니다. 신고 사유를 구체적으로 입력해주세요.';
  }
  if (!/[0-9A-Za-z\u3131-\u318E\uAC00-\uD7A3]/.test(detail)) {
    return '상세 설명에는 식별 가능한 문자(글자/숫자)를 포함해주세요.';
  }
  if (reason === 'copyright') {
    const hasLink = /(https?:\/\/|www\.)/i.test(detail);
    if (!hasLink && detail.length < 24) {
      return '저작권 침해 신고는 출처 링크 또는 구체 설명(24자 이상)을 입력해주세요.';
    }
  }
  return '';
}

export default function ReportScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ postId?: string; reportedUserId?: string; targetType?: string }>();
  const submitReport = useLegalStore((state) => state.submitReport);
  const markReportSyncStatus = useLegalStore((state) => state.markReportSyncStatus);
  const advanceReportWorkflow = useLegalStore((state) => state.advanceReportWorkflow);
  const reportHistory = useLegalStore((state) => state.reports);

  const initialTargetType = useMemo<ReportTargetType>(() => {
    const raw = String(params.targetType || '').trim();
    if (targetOptions.some((item) => item.key === raw)) return raw as ReportTargetType;
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

  const targetIdError = useMemo(() => validateTargetIdByType(targetType, targetId), [targetId, targetType]);
  const detailError = useMemo(() => {
    if (detail.length > MAX_DETAIL_LENGTH) return `상세 설명은 최대 ${MAX_DETAIL_LENGTH}자까지 입력할 수 있습니다.`;
    const minLength = requiredDetailLength(reason);
    if (!minLength) return '';
    if (detail.trim().length < minLength) {
      return `선택한 신고 사유는 상세 설명(최소 ${minLength}자)이 필요합니다.`;
    }
    return validateDetailQuality(reason, detail) || '';
  }, [detail, reason]);

  const optionalDetailError = useMemo(() => {
    if (requiredDetailLength(reason) > 0) return '';
    if (detail.length > MAX_DETAIL_LENGTH) return `상세 설명은 최대 ${MAX_DETAIL_LENGTH}자까지 입력할 수 있습니다.`;
    return validateDetailQuality(reason, detail);
  }, [detail, reason]);
  const canSubmit = Boolean(reason) && !submitting && !targetIdError && !detailError && !optionalDetailError;

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
      return '동일 신고가 최근 접수되어 중복 제출할 수 없습니다.';
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
      return '동일 대상에 대한 연속 신고는 30초 후 다시 시도해주세요.';
    }
    const dailyCount = reportHistory.filter((item) => {
      if (item.reporterUserId !== user?.id) return false;
      const createdMs = Date.parse(String(item.createdAt || ''));
      if (!Number.isFinite(createdMs)) return false;
      return Date.now() - createdMs < 24 * 60 * 60 * 1000;
    }).length;
    if (dailyCount >= 20) {
      return '신고는 24시간 기준 최대 20건까지 접수할 수 있습니다.';
    }
    if (Date.now() - lastSubmittedAt < 3500) {
      return '연속 신고 방지를 위해 잠시 후 다시 시도해주세요.';
    }
    if (targetType === 'user') {
      const selfId = normalizeTargetId(String(user?.id || ''));
      if (selfId && normalizedTargetId === selfId) {
        return '본인 계정은 신고할 수 없습니다.';
      }
    }
    return '';
  };

  const onSubmit = async () => {
    if (!user?.id) {
      Alert.alert('로그인 필요', '신고 기능은 로그인 후 이용할 수 있습니다.');
      return;
    }
    if (!canSubmit) return;
    const validationError = validateBeforeSubmit();
    if (validationError) {
      Alert.alert('입력 확인', validationError);
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

      Alert.alert('신고 접수 완료', '신고가 접수되었습니다. 검토 후 조치됩니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      if (localReportId && shouldQueueReportSync(error)) {
        markReportSyncStatus(localReportId, 'pending', formatReportError(error));
        setLastSubmittedAt(Date.now());
        Alert.alert(
          '신고 접수 완료 (동기화 대기)',
          '네트워크 또는 서버 상태로 즉시 동기화되지 않았습니다. 신고 내용은 앱에 보관되며 이후 동기화됩니다.',
          [{ text: '확인', onPress: () => router.back() }]
        );
        return;
      }
      if (localReportId) {
        markReportSyncStatus(localReportId, 'failed', formatReportError(error));
      }
      Alert.alert('신고 실패', formatReportError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const retryPendingReport = async (reportId: string) => {
    const report = reportHistory.find((item) => item.id === reportId);
    if (!report || !user?.id) return;
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
      Alert.alert('동기화 완료', '대기 중이던 신고가 서버에 동기화되었습니다.');
    } catch (error: any) {
      const pending = shouldQueueReportSync(error);
      markReportSyncStatus(reportId, pending ? 'pending' : 'failed', formatReportError(error));
      Alert.alert('동기화 실패', formatReportError(error));
    } finally {
      setSyncingReportId('');
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 44 }}>
        <Text style={{ fontSize: 27, fontWeight: '800', color: '#0F172A' }}>신고하기</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>커뮤니티 정책 위반 콘텐츠를 신고할 수 있습니다.</Text>

        <View style={{ marginTop: 16 }}>
          <Text style={{ marginBottom: 8, color: '#334155', fontWeight: '700' }}>신고 대상</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {targetOptions.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => {
                  setTargetType(item.key);
                  if (item.key !== targetType) setTargetId('');
                }}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: targetType === item.key ? '#0D5FA8' : '#CBD5E1', backgroundColor: targetType === item.key ? '#EAF4FF' : '#fff', paddingHorizontal: 13, paddingVertical: 8 }}
              >
                <Text style={{ color: targetType === item.key ? '#0D5FA8' : '#334155', fontWeight: '700' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ marginBottom: 8, color: '#334155', fontWeight: '700' }}>대상 ID</Text>
          <TextInput value={targetId} onChangeText={setTargetId} placeholder={targetIdPlaceholderMap[targetType]} style={{ borderWidth: 1, borderColor: targetIdError ? '#FCA5A5' : '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12 }} />
          {targetIdError ? <Text style={{ marginTop: 6, color: '#B91C1C', fontSize: 12 }}>{targetIdError}</Text> : null}
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ marginBottom: 8, color: '#334155', fontWeight: '700' }}>신고 사유</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {reasonOptions.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => setReason(item.key)}
                style={{ borderRadius: 999, borderWidth: 1, borderColor: reason === item.key ? '#0D5FA8' : '#CBD5E1', backgroundColor: reason === item.key ? '#EAF4FF' : '#fff', paddingHorizontal: 13, paddingVertical: 8 }}
              >
                <Text style={{ color: reason === item.key ? '#0D5FA8' : '#334155', fontWeight: '700' }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={{ marginBottom: 8, color: '#334155', fontWeight: '700' }}>상세 설명 (선택)</Text>
          <TextInput
            value={detail}
            onChangeText={(next) => setDetail(next.slice(0, MAX_DETAIL_LENGTH))}
            multiline
            textAlignVertical="top"
            placeholder="추가 설명을 입력해주세요."
            style={{ borderWidth: 1, borderColor: detailError || optionalDetailError ? '#FCA5A5' : '#CBD5E1', borderRadius: 12, backgroundColor: '#fff', padding: 12, minHeight: 120 }}
          />
          <Text style={{ marginTop: 4, color: '#94A3B8', fontSize: 12, textAlign: 'right' }}>{detail.length}/{MAX_DETAIL_LENGTH}</Text>
          {requiredDetailLength(reason) > 0 ? (
            <Text style={{ marginTop: 6, color: detailError ? '#B91C1C' : '#B45309', fontSize: 12 }}>
              {detailError || `현재 선택한 사유는 상세 설명(최소 ${requiredDetailLength(reason)}자)이 필요합니다.`}
            </Text>
          ) : optionalDetailError ? (
            <Text style={{ marginTop: 6, color: '#B91C1C', fontSize: 12 }}>{optionalDetailError}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#D9E4F1', backgroundColor: '#F8FBFF', padding: 12 }}>
          <Text style={{ color: '#0F172A', fontWeight: '700' }}>접수 미리보기</Text>
          <Text style={{ marginTop: 6, color: '#475569' }}>대상: {targetType} / {targetId.trim() || '-'}</Text>
          <Text style={{ marginTop: 2, color: '#475569' }}>사유: {reason}</Text>
          <Text style={{ marginTop: 2, color: '#64748B' }}>상세: {detail.trim() || '(없음)'}</Text>
        </View>

        {myPendingReports.length ? (
          <View style={{ marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', backgroundColor: '#FFFBEB', padding: 12 }}>
            <Text style={{ color: '#9A3412', fontWeight: '800' }}>동기화 대기 신고 {myPendingReports.length}건</Text>
            {myPendingReports.map((item) => (
              <View key={item.id} style={{ marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FDBA74', backgroundColor: '#fff', padding: 10 }}>
                <Text style={{ color: '#7C2D12', fontWeight: '700' }}>
                  {item.targetType} / {item.targetId}
                </Text>
                <Text style={{ marginTop: 2, color: '#9A3412', fontSize: 12 }}>
                  상태: {item.syncStatus === 'failed' ? '실패' : '대기'}{item.syncError ? ` · ${item.syncError}` : ''}
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
                    {syncingReportId === item.id ? '동기화중...' : '지금 동기화'}
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
          <Text style={{ color: '#fff', fontWeight: '800' }}>{submitting ? '처리중...' : '신고 접수'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(tabs)/community-policy' as never)} style={{ marginTop: 12 }}>
          <Text style={{ color: '#0D5FA8', fontWeight: '700' }}>커뮤니티 운영정책 보기</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: '#D9E4F1', backgroundColor: '#fff', padding: 12 }}>
          <Text style={{ color: '#0F172A', fontWeight: '700' }}>최근 신고 이력 (로컬 확인용)</Text>
          {myRecentReports.length === 0 ? (
            <Text style={{ marginTop: 6, color: '#64748B' }}>최근 신고 이력이 없습니다.</Text>
          ) : (
            myRecentReports.map((item) => (
              <View key={item.id} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#334155', fontWeight: '700' }}>
                    {item.targetType} / {item.targetId}
                  </Text>
                  <Text style={{ color: reportStatusColorMap[item.status], fontWeight: '800', fontSize: 12 }}>
                    {reportStatusLabelMap[item.status]}
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
                        Alert.alert('안내', result.message || '처리할 수 없는 상태입니다.');
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
                    <Text style={{ color: '#334155', fontWeight: '700', fontSize: 12 }}>검토 진행 (mock)</Text>
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
