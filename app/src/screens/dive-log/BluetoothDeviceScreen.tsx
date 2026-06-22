import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { IntegrationStatusCard } from '../../components/IntegrationStatusCard';
import type { DiveDevice, DiveLog } from '../../models';
import type { ExternalProviderType } from '../../services/diveLogSyncService';
import { syncExternalDiveLogs } from '../../services/diveLogSyncService';
import { connectGarminAccount, disconnectGarminAccount } from '../../services/garminService';
import { connectShearwaterAccount, disconnectShearwaterAccount } from '../../services/shearwaterService';
import { connectSuuntoAccount, disconnectSuuntoAccount } from '../../services/suuntoService';
import { useDiveLogStore } from '../../stores/diveLogStore';
import { useIntegrationStore } from '../../stores/integrationStore';

type BluetoothDiveServiceModule = typeof import('../../services/bluetoothDiveService');

let bluetoothServicePromise: Promise<BluetoothDiveServiceModule> | null = null;

function loadBluetoothDiveService() {
  if (!bluetoothServicePromise) {
    bluetoothServicePromise = import('../../services/bluetoothDiveService');
  }
  return bluetoothServicePromise;
}

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

function formatRssi(rssi?: number) {
  if (!Number.isFinite(Number(rssi))) return '-';
  return `${Number(rssi)} dBm`;
}

function getSignalLabel(rssi?: number) {
  const value = Number(rssi);
  if (!Number.isFinite(value)) return { label: '알 수 없음', color: '#64748B' };
  if (value >= -55) return { label: '매우 강함', color: '#166534' };
  if (value >= -67) return { label: '강함', color: '#15803D' };
  if (value >= -75) return { label: '보통', color: '#0D5FA8' };
  if (value >= -85) return { label: '약함', color: '#B45309' };
  return { label: '매우 약함', color: '#B91C1C' };
}

function joinList(values?: string[], maxItems = 6) {
  if (!values || values.length === 0) return '-';
  const sliced = values.slice(0, maxItems);
  const suffix = values.length > maxItems ? ` 외 ${values.length - maxItems}개` : '';
  return `${sliced.join(', ')}${suffix}`;
}

function previewData(value?: string, max = 28) {
  const raw = String(value || '').trim();
  if (!raw) return '-';
  return raw.length > max ? `${raw.slice(0, max)}...` : raw;
}

function dedupeAndSortDevices(rows: DiveDevice[]) {
  const map = new Map<string, DiveDevice>();
  for (const row of rows) {
    if (!row?.id) continue;
    map.set(row.id, row);
  }
  return [...map.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function BluetoothDeviceScreen() {
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanRunIdRef = useRef(0);
  const scanAbortRef = useRef(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSheetVisible, setScanSheetVisible] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState('');
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [devices, setDevices] = useState<DiveDevice[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
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
  const connectedProviderCount = useMemo(
    () => integrationItems.filter((item) => item.connected).length,
    [integrationItems]
  );
  const syncTargetCount = useMemo(
    () => connectedProviderCount + registeredDiveDevices.length,
    [connectedProviderCount, registeredDiveDevices.length]
  );

  useEffect(() => {
    let mounted = true;
    const bootstrapPermission = async () => {
      const { checkBluetoothPermission: checkBluetoothPermissionFromService, getConnectedDiveComputerId } = await loadBluetoothDiveService();
      if (!mounted) return;
      const ok = await checkBluetoothPermissionFromService();
      if (!mounted) return;
      setPermissionGranted(ok);
      setConnectedDeviceId(getConnectedDiveComputerId());
      if (ok) {
        updateIntegration('bluetooth', { connected: true, statusMessage: '권한 허용됨' });
      }
    };
    void bootstrapPermission();
    return () => {
      mounted = false;
    };
  }, [updateIntegration]);

  useEffect(() => {
    return () => {
      scanAbortRef.current = true;
      scanRunIdRef.current += 1;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      void loadBluetoothDiveService()
        .then(({ stopDiveComputerScan }) => stopDiveComputerScan())
        .catch(() => undefined);
    };
  }, []);

  const requestPermission = async (options?: { silentDeniedAlert?: boolean }) => {
    const silentDeniedAlert = Boolean(options?.silentDeniedAlert);
    const { requestBluetoothPermission } = await loadBluetoothDiveService();
    const ok = await requestBluetoothPermission();
    setPermissionGranted(ok);
    if (!ok) {
      markSyncFailure('bluetooth', 'Bluetooth 권한 거부');
      if (!silentDeniedAlert) {
        Alert.alert('권한 필요', 'Bluetooth 권한이 거부되어 기기 스캔을 진행할 수 없습니다.');
      }
      return false;
    }
    updateIntegration('bluetooth', { connected: true, statusMessage: '권한 허용됨' });
    return true;
  };

  const scan = async () => {
    if (scanning) return;
    const hasPermission = permissionGranted || (await requestPermission({ silentDeniedAlert: true }));
    if (!hasPermission) {
      setScanStatusMessage('Bluetooth 권한이 없어 스캔할 수 없습니다.');
      return;
    }
    setScanStatusMessage('주변 BLE 기기를 검색 중입니다...');
    setDevices([]);
    setScanning(true);
    scanAbortRef.current = false;
    scanRunIdRef.current += 1;
    const scanRunId = scanRunIdRef.current;
    const deadlineMs = Date.now() + 180000;
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    scanTimeoutRef.current = setTimeout(() => {
      if (scanRunId !== scanRunIdRef.current) return;
      scanAbortRef.current = true;
      void loadBluetoothDiveService()
        .then(({ stopDiveComputerScan }) => stopDiveComputerScan())
        .catch(() => undefined);
      setScanning(false);
      setScanStatusMessage('3분 스캔 시간이 종료되어 자동으로 중지되었습니다. 다시 검색할 수 있습니다.');
    }, 185000);

    try {
      const {
        getBluetoothScanDiagnostics,
        scanDiveComputers,
        stopDiveComputerScan,
      } = await loadBluetoothDiveService();
      let merged: DiveDevice[] = [];
      while (!scanAbortRef.current && scanRunId === scanRunIdRef.current && Date.now() < deadlineMs) {
        const remainMs = Math.max(0, deadlineMs - Date.now());
        const sliceMs = Math.max(3000, Math.min(7000, remainMs));
        const chunk = await scanDiveComputers(sliceMs);
        if (scanAbortRef.current || scanRunId !== scanRunIdRef.current) return;
        if (chunk.length > 0) {
          merged = dedupeAndSortDevices([...merged, ...chunk]);
          const now = new Date().toISOString();
          setDevices(merged);
          setLastScanAt(now);
          merged.forEach((item) => markDiveDeviceSeen(item.id, item.lastSeenAt || now));
          const status = `기기 ${merged.length}개 검색됨`;
          setScanStatusMessage(status);
          updateIntegration('bluetooth', { statusMessage: status });
        } else {
          const remainSec = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
          const diag = getBluetoothScanDiagnostics();
          const filterHint = diag.activeFilterKeywords.length ? ` · 필터 ${diag.activeFilterKeywords.length}개` : '';
          const stateHint = diag.lastNativeState ? ` · state=${diag.lastNativeState}` : '';
          const callbackHint = Number.isFinite(Number(diag.lastNativeCallbackCount)) ? ` · callbacks=${diag.lastNativeCallbackCount}` : '';
          const errorHint = diag.lastNativeError ? ` · native=${diag.lastNativeError}` : '';
          setScanStatusMessage(`주변 BLE 기기 검색 중... (${remainSec}초 남음${filterHint}${stateHint}${callbackHint}${errorHint})`);
        }
        if (Date.now() >= deadlineMs) break;
        await wait(200);
      }
      if (scanAbortRef.current || scanRunId !== scanRunIdRef.current) return;
      if (!merged.length) {
        const diag = getBluetoothScanDiagnostics();
        const filterText = diag.activeFilterKeywords.length
          ? `현재 필터(${diag.activeFilterKeywords.join(', ')})와 일치하는 기기가 없습니다.`
          : '주변 블루투스 기기가 없습니다.';
        const nativeText = diag.lastNativeError ? `\n상태: ${diag.lastNativeError}` : '';
        setDevices([]);
        setLastScanAt(new Date().toISOString());
        setScanStatusMessage('검색된 기기가 없습니다.');
        Alert.alert('검색 결과 없음', `${filterText}${nativeText}`);
      } else {
        setScanStatusMessage(`검색 완료 · 총 ${merged.length}개`);
      }
    } catch (error) {
      const message = String(error);
      if (message.includes('bluetooth_permission_denied')) {
        setScanStatusMessage('Bluetooth/위치 권한 또는 위치 서비스가 필요합니다.');
        Alert.alert(
          '권한 필요',
          '스캔을 위해 Bluetooth 권한, 위치 권한, 위치 서비스(기기 설정)가 모두 필요합니다. 설정에서 허용 후 다시 시도해주세요.'
        );
      } else {
        setScanStatusMessage(`스캔 실패: ${message}`);
        markSyncFailure('bluetooth', message);
        Alert.alert('스캔 실패', message);
      }
    } finally {
      if (scanRunId === scanRunIdRef.current) {
        void loadBluetoothDiveService()
          .then(({ stopDiveComputerScan }) => stopDiveComputerScan())
          .catch(() => undefined);
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
      if (scanRunId === scanRunIdRef.current) {
        setScanning(false);
      }
    }
  };

  const openScanSheet = () => {
    setScanSheetVisible(true);
    void scan();
  };

  const closeScanSheet = () => {
    scanAbortRef.current = true;
    scanRunIdRef.current += 1;
    void loadBluetoothDiveService()
      .then(({ stopDiveComputerScan }) => stopDiveComputerScan())
      .catch(() => undefined);
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setScanning(false);
    setScanSheetVisible(false);
    setScanStatusMessage('스캔 중지됨');
  };

  const syncExternalProvider = async (provider: ExternalProviderType, options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const integration = integrations.find((item) => item.type === provider);
    if (!integration?.connected) {
      if (!silent) Alert.alert('연동 필요', `${provider} 계정을 먼저 연결해주세요.`);
      return { status: 'skipped' as const, imported: 0, duplicate: 0, failed: 0, message: 'provider_not_connected' };
    }
    const isMockAccount = /\(mock\)/i.test(String(integration.accountLabel || ''));

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
      const summaryMessage = isMockAccount
        ? `동기화 완료 (샘플 데이터 · 신규 ${result.imported.length}, 중복 ${result.duplicateCount})`
        : `동기화 완료 (신규 ${result.imported.length}, 중복 ${result.duplicateCount})`;
      markSyncSuccess(provider, summaryMessage);
      if (!silent) {
        Alert.alert(
          '동기화 완료',
          isMockAccount
            ? `${provider} 로그 ${result.imported.length}개를 가져왔습니다. 현재는 샘플 데이터 모드입니다.`
            : `${provider} 로그 ${result.imported.length}개를 가져왔습니다.`
        );
      }
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
      const testMode = /\(mock\)/i.test(String(result.accountLabel || ''));
      const normalizedLabel = String(result.accountLabel || '')
        .replace(/\(mock\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      updateIntegration(provider, {
        connected: result.connected,
        accountLabel: normalizedLabel || result.accountLabel,
        statusMessage: result.connected ? (testMode ? '테스트 모드 연결됨 (운영 키 필요)' : '연결됨') : '연결 실패',
      });
      Alert.alert(
        '연결 완료',
        testMode
          ? `${provider} 계정이 테스트 모드로 연결되었습니다. 운영 키 연동 전까지는 샘플 데이터로 동작합니다.`
          : `${provider} 계정이 연결되었습니다.`
      );
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
        const { disconnectDiveComputer } = await loadBluetoothDiveService();
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
      const { connectDiveComputer } = await loadBluetoothDiveService();
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

  const connectAndSyncDevice = async (device: DiveDevice) => {
    registerDiveDevice(device);
    setConnectingDeviceId(device.id);
    try {
      if (connectedDeviceId !== device.id) {
        const { connectDiveComputer } = await loadBluetoothDiveService();
        const result = await connectDiveComputer(device.id);
        setConnectedDeviceId(result.device.id);
        markDiveDeviceConnected(result.device.id, new Date().toISOString(), `연결됨 (배터리 ${result.info.batteryLevel ?? '-'}%)`);
        updateIntegration('bluetooth', {
          connected: true,
          accountLabel: result.device.name,
          statusMessage: `연결됨 (배터리 ${result.info.batteryLevel ?? '-'}%)`,
        });
      }
      const syncResult = await syncRegisteredDevice(device.id, { silent: true });
      if (syncResult.status === 'completed') {
        Alert.alert('가져오기 완료', `신규 ${syncResult.imported}개, 중복 ${syncResult.duplicate}개`);
      } else if (syncResult.status === 'failed') {
        Alert.alert('동기화 실패', syncResult.message || '알 수 없는 오류');
      }
    } catch (error: any) {
      const message = String(error?.message || error);
      markSyncFailure('bluetooth', message);
      Alert.alert('연결/동기화 실패', message);
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
      const { syncDiveLogsByBluetooth } = await loadBluetoothDiveService();
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
      const { syncDiveLogsByBluetooth } = await loadBluetoothDiveService();
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
              onPress={() => {
                void requestPermission();
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>{permissionGranted ? '권한 허용됨' : '권한 요청'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#0D5FA8',
                backgroundColor: '#fff',
                paddingVertical: 11,
                alignItems: 'center',
                opacity: scanning ? 0.65 : 1,
              }}
              onPress={openScanSheet}
              disabled={scanning}
            >
              <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{scanning ? '검색중...' : '기기 검색'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ marginTop: 8, color: '#64748B', fontSize: 12 }}>
            {scanStatusMessage || '기기 검색을 눌러 주변 다이빙 컴퓨터를 찾으세요.'}
            {lastScanAt ? ` · 마지막 스캔: ${formatTime(lastScanAt)}` : ''}
          </Text>
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

        <Modal visible={scanSheetVisible} transparent animationType="slide" onRequestClose={closeScanSheet}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.46)' }} onPress={closeScanSheet} />
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 26,
              minHeight: '66%',
              maxHeight: '90%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>블루투스 기기 스캔</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    void scan();
                  }}
                  disabled={scanning}
                  style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#0D5FA8',
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    opacity: scanning ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{scanning ? '검색중...' : '다시 검색'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeScanSheet}
                  style={{ borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 10, paddingVertical: 8 }}
                >
                  <Text style={{ color: '#334155', fontWeight: '700' }}>닫기</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ marginTop: 8, color: '#64748B' }}>
              {scanStatusMessage || '주변 BLE 광고 기기를 검색해 연결하고 바로 로그를 가져올 수 있습니다.'}
            </Text>
            <Text style={{ marginTop: 4, color: '#64748B' }}>검색된 기기: {devices.length}개</Text>

            <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 16 }}>
              {scanning ? (
                <View style={{ marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', padding: 12, alignItems: 'center' }}>
                  <ActivityIndicator color="#0D5FA8" />
                  <Text style={{ marginTop: 8, color: '#64748B' }}>스캔 중입니다... (실시간으로 목록이 갱신됩니다)</Text>
                </View>
              ) : null}
              {devices.length === 0 ? (
                <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', padding: 16 }}>
                  <Text style={{ color: '#64748B' }}>검색된 기기가 없습니다.</Text>
                  <Text style={{ marginTop: 6, color: '#94A3B8', fontSize: 12 }}>
                    Bluetooth 켜짐/권한 허용/기기 광고모드(Discoverable) 상태를 확인한 뒤 다시 검색하세요. iOS 특성상 BLE 광고가 없는 클래식 BT 기기는 목록에 보이지 않을 수 있습니다.
                  </Text>
                </View>
              ) : (
                devices.map((item) => {
                  const signal = getSignalLabel(item.rssi);
                  return (
                    <View
                      key={`sheet-${item.id}`}
                      style={{ marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 12 }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{item.name}</Text>
                      <Text style={{ marginTop: 2, color: '#64748B' }}>
                        브랜드: {item.brand || 'other'} / 모델: {item.model || '-'} / RSSI: {formatRssi(item.rssi)} / 감도: {signal.label}
                      </Text>
                      <Text style={{ marginTop: 2, color: '#64748B' }}>
                        Device ID: {item.id} / Local Name: {item.localName || '-'} / Connectable: {item.isConnectable === false ? 'No' : 'Yes'}
                      </Text>
                      <Text style={{ marginTop: 2, color: '#64748B' }}>
                        Service UUIDs: {joinList(item.serviceUUIDs)} / Service Data Keys: {joinList(item.serviceDataKeys)}
                      </Text>
                      <Text style={{ marginTop: 2, color: '#64748B' }}>
                        Overflow UUIDs: {joinList(item.overflowServiceUUIDs)} / Solicited UUIDs: {joinList(item.solicitedServiceUUIDs)}
                      </Text>
                      <Text style={{ marginTop: 2, color: '#64748B' }}>
                        TX Power: {Number.isFinite(Number(item.txPowerLevel)) ? `${item.txPowerLevel} dBm` : '-'} / MTU: {Number.isFinite(Number(item.mtu)) ? item.mtu : '-'}
                      </Text>
                      <Text style={{ marginTop: 2, color: '#64748B' }}>Manufacturer Data: {previewData(item.manufacturerData, 42)}</Text>
                      <Text style={{ marginTop: 2, color: signal.color, fontWeight: '700' }}>신호 상태: {signal.label}</Text>
                      <View style={{ marginTop: 9, flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ flex: 1, borderRadius: 10, backgroundColor: '#EAF4FF', paddingVertical: 10, alignItems: 'center' }}
                          onPress={() => connectOrDisconnectDevice(item)}
                          disabled={connectingDeviceId === item.id || syncingDeviceId === item.id}
                        >
                          <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>
                            {connectingDeviceId === item.id ? '연결중...' : connectedDeviceId === item.id ? '연결 해제' : '연결'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, borderRadius: 10, backgroundColor: '#ECFDF3', paddingVertical: 10, alignItems: 'center' }}
                          onPress={() => connectAndSyncDevice(item)}
                          disabled={connectingDeviceId === item.id || syncingDeviceId === item.id}
                        >
                          <Text style={{ color: '#166534', fontWeight: '800' }}>
                            {syncingDeviceId === item.id ? '가져오는 중...' : '연결 후 로그 가져오기'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Modal>
      </ScrollView>
    </Screen>
  );
}
