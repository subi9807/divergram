import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../components/Screen';
import { IntegrationStatusCard } from '../../components/IntegrationStatusCard';
import { useIntegrationStore } from '../../stores/integrationStore';
import { connectGarminAccount, disconnectGarminAccount } from '../../services/garminService';
import { connectShearwaterAccount, disconnectShearwaterAccount } from '../../services/shearwaterService';
import { connectSuuntoAccount, disconnectSuuntoAccount } from '../../services/suuntoService';
import { appRouteMap } from '../../config/sitemap';
import type { UserIntegration } from '../../models';
import { apiClient } from '../../lib/api';
import { isInstagramShareAvailable } from '../../services/instagramShareService';
import { flushPendingMediaDeletes, getPendingDeleteCount } from '../../services/cloudinaryService';
import { checkAiHealth } from '../../services/aiService';

const integrationDisplayNameMap: Record<string, string> = {
  google_maps: 'Google Maps',
  stormglass: 'Stormglass',
  garmin: 'Garmin',
  suunto: 'Suunto',
  shearwater: 'Shearwater',
  instagram_share: 'Instagram',
  cloudinary: 'Cloudinary',
  openai: 'OpenAI',
  fcm: 'FCM',
};

const managedConnectionTypes = new Set(['garmin', 'suunto', 'shearwater']);
const DIAGNOSTIC_COOLDOWN_MS = 60 * 1000;
const hasGoogleMapsKey = Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY);
const hasStormglassKey = Boolean(process.env.EXPO_PUBLIC_STORMGLASS_API_KEY || process.env.STORMGLASS_API_KEY);

function hasAny(status: string, keywords: string[]) {
  return keywords.some((keyword) => status.includes(keyword));
}

function isFailureStatus(statusMessage?: string) {
  const status = String(statusMessage || '').toLowerCase();
  return hasAny(status, ['실패', 'error', 'fail']);
}

function requiresAttention(item: UserIntegration) {
  const status = String(item.statusMessage || '').toLowerCase();
  if (!item.connected && managedConnectionTypes.has(item.type)) return true;
  return hasAny(status, ['실패', 'error', 'fail', '필요', '대기', '미지원']);
}

function priorityScore(item: UserIntegration) {
  const status = String(item.statusMessage || '').toLowerCase();
  const isFailure = hasAny(status, ['실패', 'error', 'fail']);
  const isSyncing = hasAny(status, ['동기화중', '처리중', '요청']);
  const needsAction = requiresAttention(item);
  const orderMap: Record<string, number> = {
    garmin: 0,
    suunto: 1,
    shearwater: 2,
    google_maps: 3,
    stormglass: 4,
    cloudinary: 5,
    openai: 6,
    fcm: 7,
    instagram_share: 8,
  };
  const order = orderMap[item.type] ?? 99;
  if (isFailure) return [0, order] as const;
  if (!item.connected && managedConnectionTypes.has(item.type)) return [1, order] as const;
  if (isSyncing) return [2, order] as const;
  if (needsAction) return [3, order] as const;
  if (item.connected) return [4, order] as const;
  return [5, order] as const;
}

export default function IntegrationSettingsScreen() {
  const router = useRouter();
  const integrations = useIntegrationStore((state) => state.integrations);
  const syncFailures = useIntegrationStore((state) => state.syncFailures);
  const clearSyncFailures = useIntegrationStore((state) => state.clearSyncFailures);
  const updateIntegration = useIntegrationStore((state) => state.updateIntegration);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [togglingType, setTogglingType] = useState<string | null>(null);
  const [showNeedsOnly, setShowNeedsOnly] = useState(false);
  const [showStaleOnly, setShowStaleOnly] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [pendingMediaDeleteCount, setPendingMediaDeleteCount] = useState(0);
  const [lastDiagnosticRunMs, setLastDiagnosticRunMs] = useState(0);
  const [diagnosticSummary, setDiagnosticSummary] = useState('');
  const [diagnosticNowMs, setDiagnosticNowMs] = useState(Date.now());

  const isStaleIntegration = (item: UserIntegration) => {
    if (!item.connected) return false;
    const syncMs = Date.parse(String(item.lastSyncAt || ''));
    if (!Number.isFinite(syncMs)) return true;
    return Date.now() - syncMs > 24 * 60 * 60 * 1000;
  };

  const items = useMemo(
    () =>
      integrations
        .filter((item) => ['google_maps', 'stormglass', 'garmin', 'suunto', 'shearwater', 'instagram_share', 'cloudinary', 'openai', 'fcm'].includes(item.type))
        .sort((a, b) => {
          const [aPriority, aOrder] = priorityScore(a);
          const [bPriority, bOrder] = priorityScore(b);
          if (aPriority !== bPriority) return aPriority - bPriority;
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aSync = Date.parse(String(a.lastSyncAt || ''));
          const bSync = Date.parse(String(b.lastSyncAt || ''));
          if (Number.isFinite(aSync) && Number.isFinite(bSync)) return bSync - aSync;
          return 0;
        }),
    [integrations]
  );
  const summary = useMemo(() => {
    const connected = items.filter((item) => item.connected).length;
    const needsAction = items.filter((item) => requiresAttention(item)).length;
    const syncing = items.filter((item) => hasAny(String(item.statusMessage || '').toLowerCase(), ['동기화중', '처리중', '요청'])).length;
    const failed = items.filter((item) => hasAny(String(item.statusMessage || '').toLowerCase(), ['실패', 'error', 'fail'])).length;
    const disconnectedManaged = items.filter((item) => managedConnectionTypes.has(item.type) && !item.connected).length;
    const stale = items.filter((item) => {
      if (!item.connected) return false;
      const syncMs = Date.parse(String(item.lastSyncAt || ''));
      if (!Number.isFinite(syncMs)) return true;
      return Date.now() - syncMs > 24 * 60 * 60 * 1000;
    }).length;
    return { connected, needsAction, syncing, failed, stale, disconnectedManaged, total: items.length };
  }, [items]);
  const displayItems = useMemo(() => {
    return items.filter((item) => {
      if (showNeedsOnly && !requiresAttention(item)) return false;
      if (showStaleOnly && !isStaleIntegration(item)) return false;
      return true;
    });
  }, [items, showNeedsOnly, showStaleOnly]);
  const failedManagedItems = useMemo(
    () => items.filter((item) => managedConnectionTypes.has(item.type) && item.connected && isFailureStatus(item.statusMessage)),
    [items]
  );
  const lastDiagnosticAt = useMemo(() => {
    const targets = items.filter((item) => ['cloudinary', 'fcm', 'instagram_share'].includes(item.type));
    const latestMs = targets.reduce((best, item) => {
      const ms = Date.parse(String(item.lastSyncAt || ''));
      if (!Number.isFinite(ms)) return best;
      return ms > best ? ms : best;
    }, 0);
    if (!latestMs) return '';
    return new Date(latestMs).toLocaleString();
  }, [items]);
  const diagnosticCooldownSec = useMemo(() => {
    if (!lastDiagnosticRunMs) return 0;
    const remainMs = DIAGNOSTIC_COOLDOWN_MS - (diagnosticNowMs - lastDiagnosticRunMs);
    if (remainMs <= 0) return 0;
    return Math.max(1, Math.ceil(remainMs / 1000));
  }, [diagnosticNowMs, lastDiagnosticRunMs]);

  const runIntegrationDiagnostics = useCallback(
    async (silent = false) => {
      if (diagnosing) return;
      const nowMs = Date.now();
      if (!silent && lastDiagnosticRunMs && nowMs - lastDiagnosticRunMs < DIAGNOSTIC_COOLDOWN_MS) {
        const remainSec = Math.max(1, Math.ceil((DIAGNOSTIC_COOLDOWN_MS - (nowMs - lastDiagnosticRunMs)) / 1000));
        Alert.alert('잠시 후 다시 시도', `연동 상태 점검은 ${remainSec}초 후 다시 실행할 수 있습니다.`);
        return;
      }
      setDiagnosing(true);
      const now = new Date().toISOString();
      const errors: string[] = [];
      let successCount = 0;
      try {
        updateIntegration('google_maps', {
          connected: hasGoogleMapsKey,
          statusMessage: hasGoogleMapsKey ? 'API Key 확인됨' : 'API Key 필요',
          lastSyncAt: now,
        });
        if (hasGoogleMapsKey) successCount += 1;
        else errors.push('GoogleMaps:key_missing');

        updateIntegration('stormglass', {
          connected: hasStormglassKey,
          statusMessage: hasStormglassKey ? 'API Key 확인됨' : 'API Key 필요',
          lastSyncAt: now,
        });
        if (hasStormglassKey) successCount += 1;
        else errors.push('Stormglass:key_missing');

        try {
          await apiClient.getNotificationSetting();
          updateIntegration('fcm', {
            connected: true,
            statusMessage: '설정 확인됨',
            lastSyncAt: now,
          });
          successCount += 1;
        } catch (error: any) {
          const status = Number(error?.response?.status || 0);
          updateIntegration('fcm', {
            connected: false,
            statusMessage: status === 401 ? '로그인 필요' : '설정 점검 필요',
            lastSyncAt: now,
          });
          errors.push(`FCM:${status || 'error'}`);
        }

        try {
          await apiClient.requestCloudinarySignedUpload({
            resourceType: 'image',
            fileName: 'integration-health-check.jpg',
            folder: 'divergram',
          });
          updateIntegration('cloudinary', {
            connected: true,
            statusMessage: '서명 API 정상',
            lastSyncAt: now,
          });
          successCount += 1;
        } catch (error: any) {
          const status = Number(error?.response?.status || 0);
          const code = String(error?.response?.data?.error || error?.code || '').toLowerCase();
          const required = Array.isArray(error?.response?.data?.required)
            ? error.response.data.required.join(', ')
            : '';
          updateIntegration('cloudinary', {
            connected: false,
            statusMessage:
              status === 401
                ? '로그인 필요'
                : code.includes('cloudinary_not_configured')
                  ? required
                    ? `설정 필요(${required})`
                    : '설정 필요(CLOUDINARY 키)'
                  : '서명 API 점검 필요',
            lastSyncAt: now,
          });
          errors.push(`Cloudinary:${status || code || 'error'}`);
        }

        try {
          const ai = await checkAiHealth();
          updateIntegration('openai', {
            connected: ai.status === 'ready',
            statusMessage: ai.message,
            lastSyncAt: now,
          });
          if (ai.status === 'ready') successCount += 1;
          else errors.push(`OpenAI:${ai.status}`);
        } catch {
          updateIntegration('openai', {
            connected: false,
            statusMessage: '응답 점검 실패',
            lastSyncAt: now,
          });
          errors.push('OpenAI:error');
        }

        try {
          const installed = await isInstagramShareAvailable();
          updateIntegration('instagram_share', {
            connected: installed,
            statusMessage: installed ? '공유 사용 가능' : '앱 미설치(공유시트 fallback)',
            lastSyncAt: now,
          });
          if (installed) successCount += 1;
          else errors.push('Instagram:not_installed');
        } catch {
          updateIntegration('instagram_share', {
            connected: false,
            statusMessage: '공유 상태 점검 실패',
            lastSyncAt: now,
          });
          errors.push('Instagram:error');
        }

        setDiagnosticSummary(errors.length ? errors.join(' | ') : `정상 ${successCount}개`);
        if (!silent) {
          const summary = errors.length
            ? `정상 ${successCount}개 · 점검 필요 ${errors.length}개`
            : 'Maps, Stormglass, Cloudinary, OpenAI, FCM, Instagram 상태가 정상입니다.';
          Alert.alert('상태 점검 완료', summary);
        }
      } finally {
        const doneMs = Date.now();
        setDiagnosticNowMs(doneMs);
        setLastDiagnosticRunMs(doneMs);
        setDiagnosing(false);
      }
    },
    [diagnosing, lastDiagnosticRunMs, updateIntegration]
  );

  useEffect(() => {
    runIntegrationDiagnostics(true);
  }, [runIntegrationDiagnostics]);

  useEffect(() => {
    if (!lastDiagnosticRunMs) return;
    if (diagnosticCooldownSec <= 0) return;
    const timer = setInterval(() => {
      setDiagnosticNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [diagnosticCooldownSec, lastDiagnosticRunMs]);

  useEffect(() => {
    setPendingMediaDeleteCount(getPendingDeleteCount());
  }, [integrations]);

  const retryFailedManagedItems = () => {
    if (!failedManagedItems.length) {
      Alert.alert('재시도 대상 없음', '현재 실패 상태의 연동 항목이 없습니다.');
      return;
    }
    const now = new Date().toISOString();
    failedManagedItems.forEach((item) => {
      updateIntegration(item.type, {
        connected: true,
        statusMessage: '동기화 재요청됨',
        lastSyncAt: now,
      });
    });
    Alert.alert('재요청 완료', `실패 항목 ${failedManagedItems.length}개를 동기화 재요청 상태로 전환했습니다.`);
  };

  const clearPendingMediaDeletes = async () => {
    try {
      const result = await flushPendingMediaDeletes(30);
      setPendingMediaDeleteCount(result.remaining);
      Alert.alert('정리 실행 완료', `삭제 대기 ${result.attempted}건 점검, ${result.removed}건 정리, ${result.remaining}건 대기`);
    } catch (error: any) {
      Alert.alert('정리 실패', String(error?.message || error));
    }
  };

  const openIntegrationDetail = (type: string) => {
    if (type === 'stormglass') {
      router.push(appRouteMap.marine_weather.path as never);
      return;
    }
    if (type === 'fcm') {
      router.push(appRouteMap.notification_settings.path as never);
      return;
    }
    if (type === 'openai') {
      router.push(appRouteMap.ai_settings.path as never);
      return;
    }
    if (type === 'google_maps') {
      router.push(appRouteMap.location.path as never);
      return;
    }
    Alert.alert('안내', `${type}는 현재 앱 설정 기반으로 동작합니다.`);
  };

  const connectProvider = async (type: string) => {
    if (type === 'garmin') return connectGarminAccount();
    if (type === 'suunto') return connectSuuntoAccount();
    if (type === 'shearwater') return connectShearwaterAccount();
    return { connected: true, accountLabel: type };
  };

  const disconnectProvider = async (type: string) => {
    if (type === 'garmin') return disconnectGarminAccount();
    if (type === 'suunto') return disconnectSuuntoAccount();
    if (type === 'shearwater') return disconnectShearwaterAccount();
    return;
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>외부 서비스 연동</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>
          지도, 날씨, 로그 연동, AI/미디어/푸시 연동 상태를 관리할 수 있습니다.
        </Text>
        <View style={{ marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 12 }}>
          <Text style={{ color: '#0F172A', fontWeight: '800' }}>연동 요약</Text>
          <Text style={{ marginTop: 6, color: '#475569' }}>
            연결 {summary.connected}/{summary.total} · 조치 필요 {summary.needsAction} · 처리중 {summary.syncing}
          </Text>
          <Text style={{ marginTop: 2, color: summary.failed > 0 ? '#B91C1C' : '#64748B', fontSize: 12, fontWeight: '700' }}>
            우선 점검: 실패 {summary.failed} · 장기 미동기화 {summary.stale} · 계정연결 필요 {summary.disconnectedManaged}
          </Text>
          {lastDiagnosticAt ? (
            <Text style={{ marginTop: 2, color: '#64748B', fontSize: 12 }}>
              연동 진단 최신 시각: {lastDiagnosticAt}
            </Text>
          ) : null}
          {diagnosticSummary ? (
            <Text style={{ marginTop: 2, color: diagnosticSummary.includes('정상') && !diagnosticSummary.includes('|') ? '#0F766E' : '#B45309', fontSize: 12, fontWeight: '700' }}>
              진단 요약: {diagnosticSummary}
            </Text>
          ) : null}
          {pendingMediaDeleteCount > 0 ? (
            <Text style={{ marginTop: 2, color: '#B45309', fontSize: 12, fontWeight: '700' }}>
              미디어 삭제 대기 {pendingMediaDeleteCount}건
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={() => setShowNeedsOnly((prev) => !prev)}
            style={{
              marginTop: 10,
              alignSelf: 'flex-start',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: showNeedsOnly ? '#0D5FA8' : '#CBD5E1',
              backgroundColor: showNeedsOnly ? '#EAF4FF' : '#fff',
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: showNeedsOnly ? '#0D5FA8' : '#475569', fontWeight: '700' }}>
              {showNeedsOnly ? '전체 보기' : '조치 필요만 보기'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowStaleOnly((prev) => !prev)}
            style={{
              marginTop: 8,
              alignSelf: 'flex-start',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: showStaleOnly ? '#B45309' : '#CBD5E1',
              backgroundColor: showStaleOnly ? '#FFF7ED' : '#fff',
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: showStaleOnly ? '#B45309' : '#475569', fontWeight: '700' }}>
              {showStaleOnly ? '장기 미동기화 전체 보기' : '장기 미동기화만 보기(24h+)'}
            </Text>
          </TouchableOpacity>
          <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => runIntegrationDiagnostics(false)}
                disabled={diagnosing || diagnosticCooldownSec > 0}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: diagnosing || diagnosticCooldownSec > 0 ? '#E2E8F0' : '#93C5FD',
                  backgroundColor: diagnosing || diagnosticCooldownSec > 0 ? '#F8FAFC' : '#EFF6FF',
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: diagnosing || diagnosticCooldownSec > 0 ? '#94A3B8' : '#1D4ED8', fontWeight: '700', fontSize: 12 }}>
                  {diagnosing ? '점검중...' : diagnosticCooldownSec > 0 ? `연동 상태 점검 (${diagnosticCooldownSec}s)` : '연동 상태 점검'}
                </Text>
              </TouchableOpacity>
            <TouchableOpacity
              onPress={retryFailedManagedItems}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: failedManagedItems.length ? '#FECACA' : '#E2E8F0',
                backgroundColor: failedManagedItems.length ? '#FFF1F2' : '#F8FAFC',
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: failedManagedItems.length ? '#B91C1C' : '#64748B', fontWeight: '700', fontSize: 12 }}>
                실패 항목 재요청 ({failedManagedItems.length})
              </Text>
            </TouchableOpacity>
            {pendingMediaDeleteCount > 0 ? (
              <TouchableOpacity
                onPress={clearPendingMediaDeletes}
                style={{
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                  backgroundColor: '#FFFBEB',
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: '#B45309', fontWeight: '700', fontSize: 12 }}>삭제 대기 정리</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => router.push(appRouteMap.bluetooth_devices.path as never)}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#BFDBFE',
                backgroundColor: '#EFF6FF',
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 12 }}>다이빙 컴퓨터 관리</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(appRouteMap.dive_log_management.path as never)}
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#CFFAFE',
                backgroundColor: '#ECFEFF',
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            >
              <Text style={{ color: '#0F766E', fontWeight: '700', fontSize: 12 }}>DiveLog 관리</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          {syncFailures.length ? (
            <View style={{ marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FFF5F5', padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#991B1B', fontWeight: '800' }}>최근 동기화 실패</Text>
                <TouchableOpacity onPress={clearSyncFailures}>
                  <Text style={{ color: '#B91C1C', fontSize: 12, fontWeight: '700' }}>기록 비우기</Text>
                </TouchableOpacity>
              </View>
              {syncFailures.slice(0, 3).map((row) => (
                <View key={row.id} style={{ marginTop: 8, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#FEE2E2', padding: 8 }}>
                  <Text style={{ color: '#7F1D1D', fontWeight: '700', fontSize: 12 }}>{integrationDisplayNameMap[row.integrationType] || row.integrationType}</Text>
                  <Text style={{ marginTop: 2, color: '#991B1B', fontSize: 12 }}>{row.message}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {displayItems.map((item) => (
            <IntegrationStatusCard
              key={item.id}
              item={item}
              showActions={managedConnectionTypes.has(item.type)}
              onOpenDetail={() => openIntegrationDetail(item.type)}
              openLabel="연동 상세 보기"
              syncDisabled={syncingType === item.type || togglingType === item.type}
              actionDisabled={syncingType === item.type || togglingType === item.type}
              syncLabel={syncingType === item.type ? '동기화중...' : undefined}
              actionLabel={togglingType === item.type ? '처리중...' : undefined}
              onSync={async () => {
                setSyncingType(item.type);
                try {
                  const displayName = integrationDisplayNameMap[item.type] || item.type;
                  if (!managedConnectionTypes.has(item.type)) {
                    updateIntegration(item.type, {
                      statusMessage: '상태 점검 완료',
                      lastSyncAt: new Date().toISOString(),
                    });
                    openIntegrationDetail(item.type);
                    return;
                  }
                  if (!item.connected) {
                    Alert.alert('연동 필요', `${displayName} 계정을 먼저 연결해주세요.`);
                    return;
                  }
                  updateIntegration(item.type, {
                    connected: item.connected,
                    statusMessage: '동기화 요청됨',
                    lastSyncAt: new Date().toISOString(),
                  });
                  Alert.alert('동기화', `${displayName} 동기화를 요청했습니다. (mock)`);
                } catch (error: any) {
                  Alert.alert('동기화 실패', String(error?.message || error));
                } finally {
                  setSyncingType(null);
                }
              }}
              onDisconnect={async () => {
                setTogglingType(item.type);
                const nextConnected = !item.connected;
                try {
                  const displayName = integrationDisplayNameMap[item.type] || item.type;
                  if (!managedConnectionTypes.has(item.type)) {
                    openIntegrationDetail(item.type);
                    return;
                  }
                  if (nextConnected) {
                    const connected = await connectProvider(item.type);
                    const mockMode = connected.accountLabel.toLowerCase().includes('(mock)');
                    updateIntegration(item.type, {
                      connected: connected.connected,
                      accountLabel: connected.accountLabel,
                      statusMessage: mockMode ? 'Mock 모드 연결 (운영 API 미지원)' : '연결됨',
                    });
                    Alert.alert('연결됨', mockMode ? `${displayName} 연결이 완료되었습니다. (Mock 모드)` : `${displayName} 연결이 완료되었습니다.`);
                    return;
                  }
                  await disconnectProvider(item.type);
                  updateIntegration(item.type, {
                    connected: false,
                    accountLabel: undefined,
                    statusMessage: '연결 해제됨',
                  });
                  Alert.alert('연결 해제', `${displayName} 연결을 해제했습니다.`);
                } catch (error: any) {
                  Alert.alert('처리 실패', String(error?.message || error));
                } finally {
                  setTogglingType(null);
                }
              }}
            />
          ))}
          {displayItems.length === 0 ? (
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
              <Text style={{ color: '#64748B' }}>현재 조치가 필요한 연동 항목이 없습니다.</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
