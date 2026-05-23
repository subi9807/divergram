import React, { useMemo, useState } from 'react';
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
