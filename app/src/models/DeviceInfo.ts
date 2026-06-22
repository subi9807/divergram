export interface DeviceInfo {
  id: string;
  name: string;
  firmwareVersion?: string;
  batteryLevel?: number;
  serialNumber?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}
