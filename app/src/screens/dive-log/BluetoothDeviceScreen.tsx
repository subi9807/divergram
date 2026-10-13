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
import { privateDiveLogService } from '../../services/privateDiveLogService';
import { resolveIntegrationStatusMessage, useIntegrationStore } from '../../stores/integrationStore';
import { useTranslation } from 'react-i18next';

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
  if (!Number.isFinite(value)) return { key: 'unknown', color: '#64748B' };
  if (value >= -55) return { key: 'veryStrong', color: '#166534' };
  if (value >= -67) return { key: 'strong', color: '#15803D' };
  if (value >= -75) return { key: 'normal', color: '#0D5FA8' };
  if (value >= -85) return { key: 'weak', color: '#B45309' };
  return { key: 'veryWeak', color: '#B91C1C' };
}

function joinList(values?: string[], maxItems = 6) {
  if (!values || values.length === 0) return '-';
  const sliced = values.slice(0, maxItems);
  const suffix = values.length > maxItems ? ` +${values.length - maxItems}` : '';
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
  const { t } = useTranslation();
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
        updateIntegration('bluetooth', { connected: true, statusMessage: 'i18nKey:bluetoothDevices.permissionGranted' });
      }
    };
    void bootstrapPermission();
    return () => {
      mounted = false;
    };
  }, [t, updateIntegration]);

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
      markSyncFailure('bluetooth', t('bluetoothDevices.messages.permissionDenied'));
      if (!silentDeniedAlert) {
        Alert.alert(t('bluetoothDevices.messages.permissionTitle'), t('bluetoothDevices.messages.permissionDeniedBody'));
      }
      return false;
    }
    updateIntegration('bluetooth', { connected: true, statusMessage: 'i18nKey:bluetoothDevices.permissionGranted' });
    return true;
  };

  const scan = async () => {
    if (scanning) return;
    const hasPermission = permissionGranted || (await requestPermission({ silentDeniedAlert: true }));
    if (!hasPermission) {
      setScanStatusMessage(t('bluetoothDevices.messages.cannotScanWithoutPermission'));
      return;
    }
    setScanStatusMessage(t('bluetoothDevices.messages.searchingNearby'));
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
      setScanStatusMessage(t('bluetoothDevices.messages.scanTimedOut'));
    }, 185000);

    try {
      const {
        getBluetoothScanDiagnostics,
        scanDiveComputers,
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
          const status = t('bluetoothDevices.messages.devicesFound', { count: merged.length });
          setScanStatusMessage(status);
          updateIntegration('bluetooth', { statusMessage: status });
        } else {
          const remainSec = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
          const diag = getBluetoothScanDiagnostics();
          const filterHint = diag.activeFilterKeywords.length ? ` · ${t('bluetoothDevices.filter')} ${diag.activeFilterKeywords.length}` : '';
          const stateHint = diag.lastNativeState ? ` · state=${diag.lastNativeState}` : '';
          const callbackHint = Number.isFinite(Number(diag.lastNativeCallbackCount)) ? ` · callbacks=${diag.lastNativeCallbackCount}` : '';
          const errorHint = diag.lastNativeError ? ` · native=${diag.lastNativeError}` : '';
          setScanStatusMessage(t('bluetoothDevices.messages.searchingRemaining', { seconds: remainSec, diagnostics: `${filterHint}${stateHint}${callbackHint}${errorHint}` }));
        }
        if (Date.now() >= deadlineMs) break;
        await wait(200);
      }
      if (scanAbortRef.current || scanRunId !== scanRunIdRef.current) return;
      if (!merged.length) {
        const diag = getBluetoothScanDiagnostics();
        const filterText = diag.activeFilterKeywords.length
          ? t('bluetoothDevices.messages.noFilterMatch', { filters: diag.activeFilterKeywords.join(', ') })
          : t('bluetoothDevices.messages.noNearbyDevices');
        const nativeText = diag.lastNativeError ? `\n${t('bluetoothDevices.status')}: ${diag.lastNativeError}` : '';
        setDevices([]);
        setLastScanAt(new Date().toISOString());
        setScanStatusMessage(t('bluetoothDevices.noDevices'));
        Alert.alert(t('bluetoothDevices.messages.noResultsTitle'), `${filterText}${nativeText}`);
      } else {
        setScanStatusMessage(t('bluetoothDevices.messages.searchComplete', { count: merged.length }));
      }
    } catch (error) {
      const message = String(error);
      if (message.includes('bluetooth_permission_denied')) {
        setScanStatusMessage(t('bluetoothDevices.messages.permissionsRequired'));
        Alert.alert(
          t('bluetoothDevices.messages.permissionTitle'),
          t('bluetoothDevices.messages.permissionsRequiredBody')
        );
      } else {
        setScanStatusMessage(t('bluetoothDevices.messages.scanFailedWithReason', { reason: message }));
        markSyncFailure('bluetooth', message);
        Alert.alert(t('bluetoothDevices.messages.scanFailed'), message);
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
    setScanStatusMessage(t('bluetoothDevices.messages.scanStopped'));
  };

  const syncExternalProvider = async (provider: ExternalProviderType, options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const integration = integrations.find((item) => item.type === provider);
    if (!integration?.connected) {
      if (!silent) Alert.alert(t('bluetoothDevices.messages.integrationRequired'), t('bluetoothDevices.messages.connectProviderFirst', { provider }));
      return { status: 'skipped' as const, imported: 0, duplicate: 0, failed: 0, message: 'provider_not_connected' };
    }
    const isMockAccount = /\(mock\)/i.test(String(integration.accountLabel || ''));

    setProviderBusyType(provider);
    markSyncStart(provider);
    try {
      const result = await syncExternalDiveLogs({ provider, userId: 'me', existingLogs: logs });
      if (result.status === 'failed') {
        markSyncFailure(provider, result.errorMessage || t('bluetoothDevices.messages.syncFailed'));
        if (!silent) Alert.alert(t('bluetoothDevices.messages.syncFailed'), `${provider}: ${result.errorMessage || t('common.error')}`);
        return { status: 'failed' as const, imported: 0, duplicate: 0, failed: 1, message: result.errorMessage || 'sync_failed' };
      }
      const saved = await privateDiveLogService.createMany(result.imported as unknown as Record<string, unknown>[]);
      appendImportedLogs(saved);
      const summaryMessage = isMockAccount
        ? t('bluetoothDevices.messages.syncSummarySample', { imported: result.imported.length, duplicate: result.duplicateCount })
        : t('bluetoothDevices.messages.syncSummary', { imported: result.imported.length, duplicate: result.duplicateCount });
      markSyncSuccess(provider, summaryMessage);
      if (!silent) {
        Alert.alert(
          t('bluetoothDevices.messages.syncComplete'),
          isMockAccount
            ? t('bluetoothDevices.messages.providerImportedSample', { provider, count: result.imported.length })
            : t('bluetoothDevices.messages.providerImported', { provider, count: result.imported.length })
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
      if (!silent) Alert.alert(t('bluetoothDevices.messages.syncFailed'), message);
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
        statusMessage: `i18nKey:${result.connected ? (testMode ? 'bluetoothDevices.messages.testModeConnected' : 'bluetoothDevices.messages.connected') : 'bluetoothDevices.messages.connectionFailed'}`,
      });
      Alert.alert(
        t('bluetoothDevices.messages.connectionComplete'),
        testMode
          ? t('bluetoothDevices.messages.providerConnectedTest', { provider })
          : t('bluetoothDevices.messages.providerConnected', { provider })
      );
    } catch (error: any) {
      const message = String(error?.message || error);
      markSyncFailure(provider, message);
      Alert.alert(t('bluetoothDevices.messages.connectionFailed'), message);
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
        statusMessage: 'i18nKey:bluetoothDevices.messages.disconnected',
      });
    } catch (error: any) {
      const message = String(error?.message || error);
      markSyncFailure(provider, message);
      Alert.alert(t('bluetoothDevices.messages.disconnectFailed'), message);
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
          statusMessage: 'i18nKey:bluetoothDevices.messages.deviceDisconnected',
        });
        markDiveDeviceSynced(reg.deviceId, { message: t('bluetoothDevices.messages.disconnected') });
      } catch (error: any) {
        markSyncFailure('bluetooth', String(error?.message || error));
        Alert.alert(t('bluetoothDevices.messages.disconnectFailed'), String(error?.message || error));
      }
      return;
    }

    setConnectingDeviceId(device.id);
    try {
      const { connectDiveComputer } = await loadBluetoothDiveService();
      const result = await connectDiveComputer(device.id);
      setConnectedDeviceId(result.device.id);
      markDiveDeviceConnected(result.device.id, new Date().toISOString(), t('bluetoothDevices.messages.connectedBattery', { battery: result.info.batteryLevel ?? '-' }));
      updateIntegration('bluetooth', {
        connected: true,
        accountLabel: result.device.name,
        statusMessage: t('bluetoothDevices.messages.connectedBattery', { battery: result.info.batteryLevel ?? '-' }),
      });
      Alert.alert(t('bluetoothDevices.messages.connectionComplete'), t('bluetoothDevices.messages.deviceConnected', { name: result.device.name }));
    } catch (error: any) {
      markSyncFailure('bluetooth', String(error?.message || error));
      Alert.alert(t('bluetoothDevices.messages.connectionFailed'), String(error?.message || error));
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
        markDiveDeviceConnected(result.device.id, new Date().toISOString(), t('bluetoothDevices.messages.connectedBattery', { battery: result.info.batteryLevel ?? '-' }));
        updateIntegration('bluetooth', {
          connected: true,
          accountLabel: result.device.name,
          statusMessage: t('bluetoothDevices.messages.connectedBattery', { battery: result.info.batteryLevel ?? '-' }),
        });
      }
      const syncResult = await syncRegisteredDevice(device.id, { silent: true });
      if (syncResult.status === 'completed') {
        Alert.alert(t('bluetoothDevices.messages.importComplete'), t('bluetoothDevices.messages.importSummary', { imported: syncResult.imported, duplicate: syncResult.duplicate }));
      } else if (syncResult.status === 'failed') {
        Alert.alert(t('bluetoothDevices.messages.syncFailed'), syncResult.message || t('bluetoothDevices.messages.unknownError'));
      }
    } catch (error: any) {
      const message = String(error?.message || error);
      markSyncFailure('bluetooth', message);
      Alert.alert(t('bluetoothDevices.messages.connectSyncFailed'), message);
    } finally {
      setConnectingDeviceId(null);
    }
  };

  const syncRegisteredDevice = async (deviceId: string, options?: { silent?: boolean }) => {
    const silent = Boolean(options?.silent);
    const reg = getRegisteredDiveDeviceByDeviceId(deviceId);
    if (!reg) {
      if (!silent) Alert.alert(t('bluetoothDevices.messages.registrationRequired'), t('bluetoothDevices.messages.registerDeviceFirst'));
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

      if (imported.length) {
        const saved = await privateDiveLogService.createMany(imported as unknown as Record<string, unknown>[]);
        appendImportedLogs(saved);
      }

      const mergedExternalIds = [
        ...new Set(
          [...(reg.lastSyncExternalLogIds || []), ...pulled.map((item) => String(item.externalLogId || '')).filter(Boolean)].slice(-80)
        ),
      ];
      const syncMessage =
        imported.length > 0
          ? t('bluetoothDevices.messages.deviceSyncImported', { count: imported.length })
          : t('bluetoothDevices.messages.noNewData');

      markDiveDeviceSynced(deviceId, {
        syncedAt: new Date().toISOString(),
        externalLogIds: mergedExternalIds,
        message: syncMessage,
      });
      markSyncSuccess('bluetooth', syncMessage);
      if (!silent) Alert.alert(t('bluetoothDevices.messages.syncComplete'), syncMessage);
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
      if (!silent) Alert.alert(t('bluetoothDevices.messages.syncFailed'), message);
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
        Alert.alert(t('bluetoothDevices.messages.dataCheck'), t('bluetoothDevices.messages.noLogsToValidate'));
        return;
      }
      const invalid = pulled.filter((item) => !item.diveDate || (!item.maxDepth && !item.totalDiveTime));
      if (invalid.length) {
        Alert.alert(t('bluetoothDevices.messages.dataWarning'), t('bluetoothDevices.messages.invalidLogs', { count: invalid.length }));
        return;
      }
      Alert.alert(t('bluetoothDevices.messages.dataValid'), t('bluetoothDevices.messages.validLogs', { count: pulled.length }));
    } catch (error: any) {
      Alert.alert(t('bluetoothDevices.messages.checkFailed'), String(error?.message || error));
    } finally {
      setCheckingShapeDeviceId(null);
    }
  };

  const syncAllRegistered = async () => {
    if (syncTargetCount <= 0) {
      Alert.alert(t('bluetoothDevices.messages.noSyncTargets'), t('bluetoothDevices.messages.noSyncTargetsBody'));
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
        t('bluetoothDevices.messages.syncAllComplete'),
        t('bluetoothDevices.messages.syncAllSummary', summary)
      );
      updateIntegration('bluetooth', {
        statusMessage: t('bluetoothDevices.messages.syncAllStatus', summary),
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
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#0F172A' }}>{t('bluetoothDevices.title')}</Text>
        <Text style={{ marginTop: 8, color: '#64748B' }}>
          {t('bluetoothDevices.subtitle')}
        </Text>

        <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
          <Text style={{ color: '#0F172A', fontWeight: '800' }}>
            {t('bluetoothDevices.summary', { providers: connectedProviderCount, devices: registeredDiveDevices.length, targets: syncTargetCount })}
          </Text>
          <Text style={{ marginTop: 4, color: '#64748B', fontSize: 12 }}>
            {t('bluetoothDevices.syncHint')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#334155', fontWeight: '700' }}>{t('bluetoothDevices.autoSync')}</Text>
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
              <Text style={{ color: '#fff', fontWeight: '800' }}>{t(permissionGranted ? 'bluetoothDevices.permissionGranted' : 'bluetoothDevices.requestPermission')}</Text>
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
              <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t(scanning ? 'bluetoothDevices.scanning' : 'bluetoothDevices.searchDevices')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ marginTop: 8, color: '#64748B', fontSize: 12 }}>
            {scanStatusMessage || t('bluetoothDevices.searchHint')}
            {lastScanAt ? ` · ${t('bluetoothDevices.lastScan')}: ${formatTime(lastScanAt)}` : ''}
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
            <Text style={{ color: '#fff', fontWeight: '800' }}>{t(syncingAll ? 'bluetoothDevices.syncingAll' : 'bluetoothDevices.syncAll')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ marginBottom: 8, fontSize: 17, fontWeight: '800', color: '#0F172A' }}>{t('bluetoothDevices.externalServices')}</Text>
          {integrationItems.map((item) => (
            <IntegrationStatusCard
              key={item.id}
              item={item}
              syncDisabled={providerBusyType === item.type || syncingAll}
              actionDisabled={providerBusyType === item.type || syncingAll}
              syncLabel={providerBusyType === item.type ? t('bluetoothDevices.syncing') : undefined}
              actionLabel={providerBusyType === item.type ? t('bluetoothDevices.processing') : undefined}
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
          <Text style={{ marginBottom: 8, fontSize: 17, fontWeight: '800', color: '#0F172A' }}>{t('bluetoothDevices.registeredComputers')}</Text>
          {registeredDiveDevices.length === 0 ? (
            <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#D9E4F1', backgroundColor: '#fff', padding: 12 }}>
              <Text style={{ color: '#64748B' }}>{t('bluetoothDevices.noRegisteredDevices')}</Text>
            </View>
          ) : (
            registeredDiveDevices.map((entry) => (
              <View key={entry.id} style={{ marginBottom: 10, borderRadius: 16, borderWidth: 1, borderColor: '#D7E4F1', backgroundColor: '#fff', padding: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{entry.name}</Text>
                <Text style={{ marginTop: 4, color: '#64748B' }}>
                  {t('bluetoothDevices.deviceMeta', { brand: entry.brand || 'other', model: entry.model || '-', syncedAt: formatTime(entry.lastSyncedAt) })}
                </Text>
                <Text style={{ marginTop: 2, color: '#64748B' }}>{t('bluetoothDevices.status')}: {resolveIntegrationStatusMessage(entry.statusMessage, t) || '-'}</Text>
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
                      {t(connectingDeviceId === entry.deviceId ? 'bluetoothDevices.connecting' : connectedDeviceId === entry.deviceId ? 'bluetoothDevices.disconnect' : 'bluetoothDevices.connectDevice')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ borderRadius: 10, backgroundColor: '#EAF4FF', paddingVertical: 10, paddingHorizontal: 12 }}
                    onPress={() => syncRegisteredDevice(entry.deviceId)}
                    disabled={syncingDeviceId === entry.deviceId}
                  >
                    <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>
                      {t(syncingDeviceId === entry.deviceId ? 'bluetoothDevices.syncing' : 'bluetoothDevices.syncLogs')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ borderRadius: 10, backgroundColor: '#EEF2FF', paddingVertical: 10, paddingHorizontal: 12 }}
                    onPress={() => runDataShapeCheck(entry.deviceId)}
                    disabled={checkingShapeDeviceId === entry.deviceId}
                  >
                    <Text style={{ color: '#4338CA', fontWeight: '800' }}>
                      {t(checkingShapeDeviceId === entry.deviceId ? 'bluetoothDevices.checking' : 'bluetoothDevices.checkDataShape')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ borderRadius: 10, backgroundColor: '#FEF2F2', paddingVertical: 10, paddingHorizontal: 12 }}
                    onPress={() => unregisterDiveDevice(entry.id)}
                  >
                    <Text style={{ color: '#B91C1C', fontWeight: '800' }}>{t('bluetoothDevices.unregister')}</Text>
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
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>{t('bluetoothDevices.scanTitle')}</Text>
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
                  <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>{t(scanning ? 'bluetoothDevices.scanning' : 'bluetoothDevices.searchAgain')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeScanSheet}
                  style={{ borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 10, paddingVertical: 8 }}
                >
                  <Text style={{ color: '#334155', fontWeight: '700' }}>{t('common.close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ marginTop: 8, color: '#64748B' }}>
              {scanStatusMessage || t('bluetoothDevices.scanDescription')}
            </Text>
            <Text style={{ marginTop: 4, color: '#64748B' }}>{t('bluetoothDevices.foundDevices', { count: devices.length })}</Text>

            <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 16 }}>
              {scanning ? (
                <View style={{ marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', padding: 12, alignItems: 'center' }}>
                  <ActivityIndicator color="#0D5FA8" />
                  <Text style={{ marginTop: 8, color: '#64748B' }}>{t('bluetoothDevices.scanningLive')}</Text>
                </View>
              ) : null}
              {devices.length === 0 ? (
                <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#D7E4F1', padding: 16 }}>
                  <Text style={{ color: '#64748B' }}>{t('bluetoothDevices.noDevices')}</Text>
                  <Text style={{ marginTop: 6, color: '#94A3B8', fontSize: 12 }}>
                    {t('bluetoothDevices.noDevicesHint')}
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
                        {t('bluetoothDevices.scanDeviceMeta', { brand: item.brand || 'other', model: item.model || '-', rssi: formatRssi(item.rssi), signal: t(`bluetoothDevices.signal.${signal.key}`) })}
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
                      <Text style={{ marginTop: 2, color: signal.color, fontWeight: '700' }}>{t('bluetoothDevices.signalStatus')}: {t(`bluetoothDevices.signal.${signal.key}`)}</Text>
                      <View style={{ marginTop: 9, flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={{ flex: 1, borderRadius: 10, backgroundColor: '#EAF4FF', paddingVertical: 10, alignItems: 'center' }}
                          onPress={() => connectOrDisconnectDevice(item)}
                          disabled={connectingDeviceId === item.id || syncingDeviceId === item.id}
                        >
                          <Text style={{ color: '#0D5FA8', fontWeight: '800' }}>
                            {t(connectingDeviceId === item.id ? 'bluetoothDevices.connecting' : connectedDeviceId === item.id ? 'bluetoothDevices.disconnect' : 'bluetoothDevices.connect')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, borderRadius: 10, backgroundColor: '#ECFDF3', paddingVertical: 10, alignItems: 'center' }}
                          onPress={() => connectAndSyncDevice(item)}
                          disabled={connectingDeviceId === item.id || syncingDeviceId === item.id}
                        >
                          <Text style={{ color: '#166534', fontWeight: '800' }}>
                            {t(syncingDeviceId === item.id ? 'bluetoothDevices.importing' : 'bluetoothDevices.connectAndImport')}
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
