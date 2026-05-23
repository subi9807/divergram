import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { IntegrationStatusCard } from '../../components/IntegrationStatusCard';
import type { DiveDevice, DiveLog } from '../../models';
import type { ExternalProviderType } from '../../services/diveLogSyncService';
import {
  connectDiveComputer,
  disconnectDiveComputer,
  getConnectedDiveComputerId,
  requestBluetoothPermission,
  scanDiveComputers,
  syncDiveLogsByBluetooth,
} from '../../services/bluetoothDiveService';
import { syncExternalDiveLogs } from '../../services/diveLogSyncService';
import { connectGarminAccount, disconnectGarminAccount } from '../../services/garminService';
import { connectShearwaterAccount, disconnectShearwaterAccount } from '../../services/shearwaterService';
import { connectSuuntoAccount, disconnectSuuntoAccount } from '../../services/suuntoService';
import { useDiveLogStore } from '../../stores/diveLogStore';
import { useIntegrationStore } from '../../stores/integrationStore';

const providerTypes: ExternalProviderType[] = ['garmin', 'suunto', 'shearwater'];

function formatTime(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

function diveLogSortMs(log: DiveLog) {
  const date = String(log.diveDate || '').trim();
  if (!date) return Number.NaN;
  const hhmm = String(log.entryTime || '00:00').slice(0, 5);
  const asIso = `${date}T${hhmm}:00`;
  const ms = Date.parse(asIso);
  if (Number.isFinite(ms)) return ms;
  const fallback = Date.parse(String(log.updatedAt || log.createdAt || ''));
  return Number.isFinite(fallback) ? fallback : Number.NaN;
}

function buildFallbackDevice(deviceId: string, name: string, brand?: DiveDevice['brand'], model?: string): DiveDevice {
  return {
    id: deviceId,
    name: name || 'Dive Device',
    model: model || '',
    brand: brand || 'other',
    protocol: 'ble',
    isConnectable: true,
  };
}

export default function BluetoothDeviceScreen() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<DiveDevice[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(getConnectedDiveComputerId());
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null);
  const [checkingShapeDeviceId, setCheckingShapeDeviceId] = useState<string | null>(null);
  const [providerBusyType, setProviderBusyType] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const logs = useDiveLogStore((state) => state.logs);
  const appendImportedLogs = useDiveLogStore((state) => state.appendImportedLogs);

  const integrations = useIntegrationStore((state) => state.integrations);
  const updateIntegration = useIntegrationStore((state) => state.updateIntegration);
  const markSyncFailure = useIntegrationStore((state) => state.markSyncFailure);
  const markSyncSuccess = useIntegrationStore((state) => state.markSyncSuccess);
  const markSyncStart = useIntegrationStore((state) => state.markSyncStart);
  const autoSyncEnabled = useIntegrationStore((state) => state.autoSyncEnabled);
  const setAutoSyncEnabled = useIntegrationStore((state) => state.setAutoSyncEnabled);

  const registeredDiveDevices = useIntegrationStore((state) => state.registeredDiveDevices);
  const registerDiveDevice = useIntegrationStore((state) => state.registerDiveDevice);
  const unregisterDiveDevice = useIntegrationStore((state) => state.unregisterDiveDevice);
  const markDiveDeviceSeen = useIntegrationStore((state) => state.markDiveDeviceSeen);
  const markDiveDeviceConnected = useIntegrationStore((state) => state.markDiveDeviceConnected);
  const markDiveDeviceSynced = useIntegrationStore((state) => state.markDiveDeviceSynced);
  const getRegisteredDiveDeviceByDeviceId = useIntegrationStore((state) => state.getRegisteredDiveDeviceByDeviceId);

  const integrationItems = useMemo(
    () => integrations.filter((item) => providerTypes.includes(item.type as ExternalProviderType)),
    [integrations]
  );
  const registeredDeviceMap = useMemo(
    () => new Map(registeredDiveDevices.map((item) => [item.deviceId, item])),
    [registeredDiveDevices]
  );
  const connectedProviderCount = useMemo(
    () => integrationItems.filter((item) => item.connected).length,
    [integrationItems]
  );
  const syncTargetCount = useMemo(
    () => connectedProviderCount + registeredDiveDevices.length,
    [connectedProviderCount, registeredDiveDevices.length]
  );

  const requestPermission = async () => {
    const ok = await requestBluetoothPermission();
    setPermissionGranted(ok);
    if (!ok) {
      markSyncFailure('bluetooth', 'Bluetooth 권한 거부');
      Alert.alert('권한 필요', 'Bluetooth 권한이 거부되어 기기 스캔을 진행할 수 없습니다.');
      return;
    }
    updateIntegration('bluetooth', { connected: true, statusMessage: '권한 허용됨' });
  };

  const scan = async () => {
    if (!permissionGranted) {
      Alert.alert('권한 필요', '먼저 Bluetooth 권한을 허용해주세요.');
      return;
    }
    setScanning(true);
    try {
      const result = await scanDiveComputers();
      setDevices(result);
      result.forEach((item) => markDiveDeviceSeen(item.id, item.lastSeenAt));
      if (!result.length) Alert.alert('검색 결과 없음', '주변에 연결 가능한 다이빙 컴퓨터가 없습니다.');
      else updateIntegration('bluetooth', { statusMessage: `기기 ${result.length}개 검색됨` });
    } catch (error) {
      markSyncFailure('bluetooth', String(error));
      Alert.alert('스캔 실패', String(error));
    } finally {
      setScanning(false);
    }
  };

  const syncExternalProvider = async (provider: ExternalProviderType, options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const integration = integrations.find((item) => item.type === provider);
    if (!integration?.connected) {
      if (!silent) Alert.alert('연동 필요', `${provider} 계정을 먼저 연결해주세요.`);
      return { status: 'skipped' as const, imported: 0, duplicate: 0, failed: 0, message: 'provider_not_connected' };
    }

    setProviderBusyType(provider);
    markSyncStart(provider);
    try {
      const result = await syncExternalDiveLogs({ provider, userId: 'me', existingLogs: logs });
      if (result.status === 'failed') {
        markSyncFailure(provider, result.errorMessage || '동기화 실패');
        if (!silent) Alert.alert('동기화 실패', `${provider}: ${result.errorMessage || '오류'}`);
        return { status: 'failed' as const, imported: 0, duplicate: 0, failed: 1, message: result.errorMessage || 'sync_failed' };
      }
      appendImportedLogs(result.imported);
      markSyncSuccess(provider, `동기화 완료 (신규 ${result.imported.length}, 중복 ${result.duplicateCount})`);
      if (!silent) Alert.alert('동기화 완료', `${provider} 로그 ${result.imported.length}개를 가져왔습니다.`);
      return {
        status: 'completed' as const,
        imported: result.imported.length,
        duplicate: result.duplicateCount,
        failed: 0,
        message: 'ok',
      };
    } catch (error: any) {
      const message = String(error?.message || error);
      markSyncFailure(provider, message);
      if (!silent) Alert.alert('동기화 실패', message);
      return { status: 'failed' as const, imported: 0, duplicate: 0, failed: 1, message };
    } finally {
      setProviderBusyType(null);
    }
  };

  const connectProvider = async (provider: ExternalProviderType) => {
    try {
      setProviderBusyType(provider);
      const result =
        provider === 'garmin'
          ? await connectGarminAccount()
          : provider === 'suunto'
            ? await connectSuuntoAccount()
            : await connectShearwaterAccount();
      const mockMode = result.accountLabel.toLowerCase().includes('(mock)');
      updateIntegration(provider, {
        connected: result.connected,
        accountLabel: result.accountLabel,
        statusMessage: result.connected ? (mockMode ? 'Mock 연결 (운영 API 미지원)' : '연결됨') : '연결 실패',
      });
      Alert.alert('연결 완료', mockMode ? `${provider} 계정이 Mock 모드로 연결되었습니다.` : `${provider} 계정이 연결되었습니다.`);
    } catch (error: any) {
      const message = String(error?.message || error);
      markSyncFailure(provider, message);
      Alert.alert('연결 실패', message);
    } finally {
      setProviderBusyType(null);
    }
  };

  const disconnectProvider = async (provider: ExternalProviderType) => {
    try {
      setProviderBusyType(provider);
      if (provider === 'garmin') await disconnectGarminAccount();
      if (provider === 'suunto') await disconnectSuuntoAccount();
      if (provider === 'shearwater') await disconnectShearwaterAccount();
      updateIntegration(provider, {
        connected: false,
        accountLabel: undefined,
        statusMessage: '연결 해제됨',
      });
    } catch (error: any) {
      const message = String(error?.message || error);
      markSyncFailure(provider, message);
      Alert.alert('연결 해제 실패', message);
    } finally {
      setProviderBusyType(null);
    }
  };

  const connectOrDisconnectDevice = async (device: DiveDevice) => {
    const reg = registerDiveDevice(device);
    if (connectedDeviceId === device.id) {
      try {
        await disconnectDiveComputer(device.id);
        setConnectedDeviceId(null);
        updateIntegration('bluetooth', {
          connected: false,
          statusMessage: '기기 연결 해제됨',
        });
        markDiveDeviceSynced(reg.deviceId, { message: '연결 해제됨' });
      } catch (error: any) {
        markSyncFailure('bluetooth', String(error?.message || error));
        Alert.alert('연결 해제 실패', String(error?.message || error));
      }
      return;
    }

    setConnectingDeviceId(device.id);
    try {
      const result = await connectDiveComputer(device.id);
      setConnectedDeviceId(result.device.id);
      markDiveDeviceConnected(result.device.id, new Date().toISOString(), `연결됨 (배터리 ${result.info.batteryLevel ?? '-'}%)`);
      updateIntegration('bluetooth', {
        connected: true,
        accountLabel: result.device.name,
        statusMessage: `연결됨 (배터리 ${result.info.batteryLevel ?? '-'}%)`,
      });
      Alert.alert('연결 완료', `${result.device.name} 연결됨`);
    } catch (error: any) {
      markSyncFailure('bluetooth', String(error?.message || error));
      Alert.alert('연결 실패', String(error?.message || error));
    } finally {
      setConnectingDeviceId(null);
    }
  };

  const syncRegisteredDevice = async (deviceId: string, options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const reg = getRegisteredDiveDeviceByDeviceId(deviceId);
    if (!reg) {
      if (!silent) Alert.alert('등록 필요', '먼저 기기를 등록해주세요.');
      return { status: 'skipped' as const, imported: 0, duplicate: 0, failed: 0, message: 'device_not_registered' };
    }

    setSyncingDeviceId(deviceId);
    markSyncStart('bluetooth');
    try {
      const pulled = await syncDiveLogsByBluetooth(deviceId);
      const existingExternalIds = new Set(
        logs
          .filter((item) => item.sourceType === 'bluetooth' && item.externalLogId)
          .map((item) => String(item.externalLogId))
      );
      const lastKnownExternalIds = new Set((reg.lastSyncExternalLogIds || []).map((item) => String(item)));
      const lastSyncedMs = Date.parse(String(reg.lastSyncedAt || ''));
      const hasLastSynced = Number.isFinite(lastSyncedMs);

      const imported = pulled.filter((item) => {
        const extId = String(item.externalLogId || '');
        if (extId && (existingExternalIds.has(extId) || lastKnownExternalIds.has(extId))) return false;
        if (hasLastSynced) {
          const rowMs = diveLogSortMs(item);
          if (Number.isFinite(rowMs) && rowMs <= lastSyncedMs) return false;
        }
        return true;
      });
      const duplicateByExisting = Math.max(0, pulled.length - imported.length);

      if (imported.length) appendImportedLogs(imported);

      const mergedExternalIds = [
        ...new Set(
          [...(reg.lastSyncExternalLogIds || []), ...pulled.map((item) => String(item.externalLogId || '')).filter(Boolean)].slice(-80)
        ),
      ];
      const syncMessage =
        imported.length > 0
          ? `동기화 완료 (신규 ${imported.length}개)`
          : '신규 데이터 없음 (마지막 동기화 이후 추가 데이터 없음)';

      markDiveDeviceSynced(deviceId, {
        syncedAt: new Date().toISOString(),
        externalLogIds: mergedExternalIds,
        message: syncMessage,
      });
      markSyncSuccess('bluetooth', syncMessage);
      if (!silent) Alert.alert('동기화 완료', syncMessage);
      return {
        status: 'completed' as const,
        imported: imported.length,
        duplicate: duplicateByExisting,
        failed: 0,
        message: syncMessage,
      };
    } catch (error: any) {
      const message = String(error?.message || error);
      markSyncFailure('bluetooth', message);
      if (!silent) Alert.alert('동기화 실패', message);
      return { status: 'failed' as const, imported: 0, duplicate: 0, failed: 1, message };
    } finally {
      setSyncingDeviceId(null);
    }
  };

  const runDataShapeCheck = async (deviceId: string) => {
    setCheckingShapeDeviceId(deviceId);
    try {
      const pulled = await syncDiveLogsByBluetooth(deviceId);
      if (!pulled.length) {
        Alert.alert('데이터 형식 체크', '검증 가능한 로그가 없습니다.');
        return;
      }
      const invalid = pulled.filter((item) => !item.diveDate || (!item.maxDepth && !item.totalDiveTime));
      if (invalid.length) {
        Alert.alert('데이터 형식 경고', `필수 최소 필드 누락 로그 ${invalid.length}개가 감지되었습니다.`);
        return;
      }
      Alert.alert('데이터 형식 정상', `최소 필드(날짜/수심 또는 시간) 검증 완료: ${pulled.length}개`);
    } catch (error: any) {
      Alert.alert('체크 실패', String(error?.message || error));
    } finally {
      setCheckingShapeDeviceId(null);
    }
  };

  const syncAllRegistered = async () => {
    if (syncTargetCount <= 0) {
      Alert.alert('동기화 대상 없음', '연결된 외부 서비스 또는 등록된 기기가 없습니다.');
      return;
    }
    setSyncingAll(true);
    try {
      const summary = {
        providersDone: 0,
        devicesDone: 0,
        imported: 0,
        duplicate: 0,
        failed: 0,
        skipped: 0,
      };
      for (const provider of providerTypes) {
        const integration = integrations.find((item) => item.type === provider);
        if (!integration?.connected) {
          summary.skipped += 1;
          continue;
        }
        const result = await syncExternalProvider(provider, { silent: true });
        if (result.status === 'completed') summary.providersDone += 1;
        if (result.status === 'failed') summary.failed += 1;
        if (result.status === 'skipped') summary.skipped += 1;
        summary.imported += result.imported;
        summary.duplicate += result.duplicate;
      }
      for (const reg of registeredDiveDevices) {
        const result = await syncRegisteredDevice(reg.deviceId, { silent: true });
        if (result.status === 'completed') summary.devicesDone += 1;
        if (result.status === 'failed') summary.failed += 1;
        if (result.status === 'skipped') summary.skipped += 1;
        summary.imported += result.imported;
        summary.duplicate += result.duplicate;
      }
      Alert.alert(
        '전체 동기화 완료',
        `서비스 ${summary.providersDone}개, 기기 ${summary.devicesDone}개 처리\n신규 ${summary.imported}개 · 중복 ${summary.duplicate}개 · 실패 ${summary.failed}개`
      );
      updateIntegration('bluetooth', {
        statusMessage: `전체동기화 완료 (신규 ${summary.imported}, 중복 ${summary.duplicate}, 실패 ${summary.failed})`,
        lastSyncAt: new Date().toISOString(),
      });
    } finally {
      setSyncingAll(false);
    }
  };

  const resolveDeviceFromRegistry = (deviceId: string, fallbackName: string, brand?: DiveDevice['brand'], model?: string) =>
    devices.find((item) => item.id === deviceId) || buildFallbackDevice(deviceId, fallbackName, brand, model);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 56 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>다이빙 컴퓨터 관리</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>
          Bluetooth 검색/연결, 외부 서비스 동기화, 데이터 형식 체크를 한 화면에서 관리합니다.
        </Text>

        <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
          <Text style={{ color: '#0F172A', fontWeight: '800' }}>
            연동 {connectedProviderCount}개 · 등록기기 {registeredDiveDevices.length}개 · 동기화 대상 {syncTargetCount}개
          </Text>
          <Text style={{ marginTop: 4, color: '#64748B', fontSize: 12 }}>
            전체 동기화는 연결된 서비스와 등록된 기기를 순차 처리합니다.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#334155', fontWeight: '700' }}>자동 동기화</Text>
            <Switch
              value={autoSyncEnabled}
              onValueChange={setAutoSyncEnabled}
              trackColor={{ false: '#CBD5E1', true: '#0D5FA8' }}
              thumbColor="#fff"
            />
          </View>
          <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, borderRadius: 12, backgroundColor: '#0D5FA8', paddingVertical: 11, alignItems: 'center' }}
              onPress={requestPermission}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>{permissionGranted ? '권한 허용됨' : '권한 요청'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#0D5FA8', backgroundColor: '#fff', paddingVertical: 11, alignItems: 'center' }}
              onPress={scan}
            >
              <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>기기 검색</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={{
              marginTop: 10,
              borderRadius: 12,
              backgroundColor: syncingAll ? '#1E3A8A' : '#0D5FA8',
              paddingVertical: 11,
              alignItems: 'center',
              opacity: syncingAll ? 0.86 : 1,
            }}
            onPress={syncAllRegistered}
            disabled={syncingAll}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>{syncingAll ? '전체 동기화중...' : '전체 동기화'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ marginBottom: 8, fontSize: 17, fontWeight: '800', color: '#0F172A' }}>외부 서비스 연동</Text>
          {integrationItems.map((item) => (
            <IntegrationStatusCard
              key={item.id}
              item={item}
              syncDisabled={providerBusyType === item.type || syncingAll}
              actionDisabled={providerBusyType === item.type || syncingAll}
              syncLabel={providerBusyType === item.type ? '동기화중...' : undefined}
              actionLabel={providerBusyType === item.type ? '처리중...' : undefined}
              onSync={() => syncExternalProvider(item.type as ExternalProviderType)}
              onDisconnect={() =>
                void (item.connected
                  ? disconnectProvider(item.type as ExternalProviderType)
                  : connectProvider(item.type as ExternalProviderType))
              }
            />
          ))}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ marginBottom: 8, fontSize: 17, fontWeight: '800', color: '#0F172A' }}>등록된 다이빙 컴퓨터</Text>
          {registeredDiveDevices.length === 0 ? (
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#D9E4F1', backgroundColor: '#fff', padding: 12 }}>
              <Text style={{ color: '#64748B' }}>등록된 기기가 없습니다. 검색 후 기기를 등록해주세요.</Text>
            </View>
          ) : (
            registeredDiveDevices.map((entry) => (
              <View key={entry.id} style={{ marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{entry.name}</Text>
                <Text style={{ marginTop: 4, color: '#64748B' }}>
                  브랜드: {entry.brand || 'other'} / 모델: {entry.model || '-'} / 마지막 동기화: {formatTime(entry.lastSyncedAt)}
                </Text>
                <Text style={{ marginTop: 2, color: '#64748B' }}>상태: {entry.statusMessage || '-'}</Text>
                <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <TouchableOpacity
                    style={{
                      borderRadius: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: connectedDeviceId === entry.deviceId ? '#FFF1F2' : '#ECFDF3',
                    }}
                    onPress={() => connectOrDisconnectDevice(resolveDeviceFromRegistry(entry.deviceId, entry.name, entry.brand, entry.model))}
                    disabled={connectingDeviceId === entry.deviceId}
                  >
                    <Text style={{ color: connectedDeviceId === entry.deviceId ? '#DC2626' : '#166534', fontWeight: '800' }}>
                      {connectingDeviceId === entry.deviceId ? '연결중...' : connectedDeviceId === entry.deviceId ? '연결 해제' : '기기 연결'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ borderRadius: 10, backgroundColor: '#EAF4FF', paddingVertical: 10, paddingHorizontal: 12 }}
                    onPress={() => syncRegisteredDevice(entry.deviceId)}
                    disabled={syncingDeviceId === entry.deviceId}
                  >
                    <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>
                      {syncingDeviceId === entry.deviceId ? '동기화중...' : '로그 동기화'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ borderRadius: 10, backgroundColor: '#EEF2FF', paddingVertical: 10, paddingHorizontal: 12 }}
                    onPress={() => runDataShapeCheck(entry.deviceId)}
                    disabled={checkingShapeDeviceId === entry.deviceId}
                  >
                    <Text style={{ color: '#4338CA', fontWeight: '800' }}>
                      {checkingShapeDeviceId === entry.deviceId ? '검사중...' : '데이터 형식 체크'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ borderRadius: 10, backgroundColor: '#FEF2F2', paddingVertical: 10, paddingHorizontal: 12 }}
                    onPress={() => unregisterDiveDevice(entry.id)}
                  >
                    <Text style={{ color: '#B91C1C', fontWeight: '800' }}>등록 해제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ marginBottom: 8, fontSize: 17, fontWeight: '800', color: '#0F172A' }}>검색된 기기</Text>
          {scanning ? (
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color="#0D5FA8" />
              <Text style={{ marginTop: 8, color: '#64748B' }}>주변 기기를 검색하고 있습니다...</Text>
            </View>
          ) : (
            devices.map((item) => {
              const alreadyRegistered = registeredDeviceMap.has(item.id);
              return (
                <View key={item.id} style={{ marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{item.name}</Text>
                  <Text style={{ marginTop: 4, color: '#64748B' }}>
                    브랜드: {item.brand || 'other'} / 모델: {item.model || '-'} / RSSI: {item.rssi ?? '-'}
                  </Text>
                  <Text style={{ marginTop: 2, color: '#64748B' }}>최근 감지: {formatTime(item.lastSeenAt)}</Text>
                  <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        paddingVertical: 10,
                        alignItems: 'center',
                        backgroundColor: alreadyRegistered ? '#E2E8F0' : '#ECFDF3',
                      }}
                      onPress={() => registerDiveDevice(item)}
                      disabled={alreadyRegistered}
                    >
                      <Text style={{ color: alreadyRegistered ? '#475569' : '#166534', fontWeight: '800' }}>
                        {alreadyRegistered ? '등록됨' : '기기 등록'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        paddingVertical: 10,
                        alignItems: 'center',
                        backgroundColor: connectedDeviceId === item.id ? '#FFF1F2' : '#EAF4FF',
                      }}
                      onPress={() => connectOrDisconnectDevice(item)}
                      disabled={connectingDeviceId === item.id}
                    >
                      <Text style={{ color: connectedDeviceId === item.id ? '#DC2626' : '#0D5FA8', fontWeight: '800' }}>
                        {connectingDeviceId === item.id ? '연결중...' : connectedDeviceId === item.id ? '연결 해제' : '즉시 연결'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
