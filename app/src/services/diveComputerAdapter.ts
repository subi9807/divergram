import type { DeviceInfo, DiveDevice, DiveLog, ExternalDiveLog } from '../models';
import { convertExternalToDiveLog } from './diveLogSyncService';
import { fetchGarminDiveLogs } from './garminService';
import { fetchShearwaterDiveLogs } from './shearwaterService';
import { fetchSuuntoDiveLogs } from './suuntoService';

export interface DiveComputerAdapter {
  scanDevices(): Promise<DiveDevice[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  getDeviceInfo(): Promise<DeviceInfo>;
  getDiveLogList(): Promise<ExternalDiveLog[]>;
  syncLogs(userId?: string): Promise<DiveLog[]>;
}

function nowIso() {
  return new Date().toISOString();
}

function withRssiJitter(base = -60) {
  return base + Math.floor(Math.random() * 9) - 4;
}

export class GenericBluetoothAdapter implements DiveComputerAdapter {
  protected connectedDeviceId: string | null = null;
  protected connectedAt: string | null = null;
  protected deviceTemplate: DiveDevice | null = null;

  constructor(deviceTemplate?: DiveDevice | null) {
    this.deviceTemplate = deviceTemplate || null;
  }

  async scanDevices(): Promise<DiveDevice[]> {
    if (this.deviceTemplate) {
      return [
        {
          ...this.deviceTemplate,
          lastSeenAt: nowIso(),
          rssi: withRssiJitter(this.deviceTemplate.rssi ?? -65),
          protocol: this.deviceTemplate.protocol || 'ble',
          isConnectable: this.deviceTemplate.isConnectable !== false,
        },
      ];
    }
    return [];
  }

  async connect(deviceId: string): Promise<void> {
    const devices = await this.scanDevices();
    const target = devices.find((item) => item.id === deviceId);
    if (!target) throw new Error('bluetooth_device_not_found');
    if (target.isConnectable === false) throw new Error('bluetooth_device_not_connectable');
    this.connectedDeviceId = deviceId;
    this.connectedAt = nowIso();
  }

  async disconnect(): Promise<void> {
    this.connectedDeviceId = null;
    this.connectedAt = null;
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    if (!this.connectedDeviceId) throw new Error('bluetooth_device_not_connected');
    const devices = await this.scanDevices();
    const target = devices.find((item) => item.id === this.connectedDeviceId);
    return {
      id: this.connectedDeviceId,
      name: target?.name || this.deviceTemplate?.name || 'Generic BLE Device',
      firmwareVersion: 'mock-1.0.0',
      batteryLevel: 72,
      serialNumber: `DG-${this.connectedDeviceId.slice(-8).toUpperCase()}`,
      connectedAt: this.connectedAt || nowIso(),
    };
  }

  async getDiveLogList(): Promise<ExternalDiveLog[]> {
    return [];
  }

  async syncLogs(userId = 'me'): Promise<DiveLog[]> {
    const list = await this.getDiveLogList();
    return list.map((item) => convertExternalToDiveLog(item, userId));
  }
}

function toBluetoothLogs(provider: 'garmin' | 'suunto' | 'shearwater', rows: ExternalDiveLog[], device: DiveDevice): ExternalDiveLog[] {
  const sourcePrefix = provider === 'garmin' ? 'g' : provider === 'suunto' ? 's' : 'sw';
  return rows.map((row, index) => ({
    ...row,
    sourceType: 'bluetooth',
    externalLogId: row.externalLogId ? `bt-${sourcePrefix}-${row.externalLogId}` : `bt-${sourcePrefix}-${Date.now()}-${index}`,
    deviceId: device.id,
    deviceName: device.name,
    rawPayload: {
      ...(row.rawPayload || {}),
      importedVia: 'bluetooth',
      provider,
    },
  }));
}

abstract class BrandedBluetoothAdapter extends GenericBluetoothAdapter {
  protected provider: 'garmin' | 'suunto' | 'shearwater';

  constructor(provider: 'garmin' | 'suunto' | 'shearwater', fallbackDevice: DiveDevice, selectedDevice?: DiveDevice | null) {
    super(selectedDevice || null);
    this.provider = provider;
    this.fallbackDevice = fallbackDevice;
  }

  protected fallbackDevice: DiveDevice;

  protected get currentDevice(): DiveDevice {
    return this.deviceTemplate || this.fallbackDevice;
  }
}

export class GarminBluetoothAdapter extends BrandedBluetoothAdapter {
  constructor(selectedDevice?: DiveDevice | null) {
    super(
      'garmin',
      {
        id: 'dev-garmin-descent',
        name: 'Garmin Descent MK2',
        brand: 'garmin',
        rssi: -54,
        isConnectable: true,
        protocol: 'ble',
      },
      selectedDevice
    );
  }

  async getDiveLogList(): Promise<ExternalDiveLog[]> {
    const all = await fetchGarminDiveLogs().catch(() => []);
    return toBluetoothLogs('garmin', all, this.currentDevice);
  }
}

export class SuuntoBluetoothAdapter extends BrandedBluetoothAdapter {
  constructor(selectedDevice?: DiveDevice | null) {
    super(
      'suunto',
      {
        id: 'dev-suunto-d5',
        name: 'Suunto D5',
        brand: 'suunto',
        rssi: -61,
        isConnectable: true,
        protocol: 'ble',
      },
      selectedDevice
    );
  }

  async getDiveLogList(): Promise<ExternalDiveLog[]> {
    const all = await fetchSuuntoDiveLogs().catch(() => []);
    return toBluetoothLogs('suunto', all, this.currentDevice);
  }
}

export class ShearwaterBluetoothAdapter extends BrandedBluetoothAdapter {
  constructor(selectedDevice?: DiveDevice | null) {
    super(
      'shearwater',
      {
        id: 'dev-shearwater-teric',
        name: 'Shearwater Teric',
        brand: 'shearwater',
        rssi: -57,
        isConnectable: true,
        protocol: 'ble',
      },
      selectedDevice
    );
  }

  async getDiveLogList(): Promise<ExternalDiveLog[]> {
    const all = await fetchShearwaterDiveLogs().catch(() => []);
    return toBluetoothLogs('shearwater', all, this.currentDevice);
  }
}

export function createDiveComputerAdapter(device?: DiveDevice | null): DiveComputerAdapter {
  if (device?.brand === 'garmin') return new GarminBluetoothAdapter(device);
  if (device?.brand === 'suunto') return new SuuntoBluetoothAdapter(device);
  if (device?.brand === 'shearwater') return new ShearwaterBluetoothAdapter(device);
  return new GenericBluetoothAdapter(device);
}

export async function scanAllDiveComputerAdapters(): Promise<DiveDevice[]> {
  const adapters: DiveComputerAdapter[] = [
    new GarminBluetoothAdapter(),
    new SuuntoBluetoothAdapter(),
    new ShearwaterBluetoothAdapter(),
    new GenericBluetoothAdapter(),
  ];
  const scanned = (await Promise.all(adapters.map((adapter) => adapter.scanDevices().catch(() => [])))).flat();
  const dedup = new Map<string, DiveDevice>();
  for (const row of scanned) {
    if (!row?.id) continue;
    dedup.set(row.id, row);
  }
  return [...dedup.values()].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
}
