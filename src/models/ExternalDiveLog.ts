export type ExternalSourceType = 'garmin_api' | 'suunto_api' | 'shearwater_api' | 'bluetooth';

export interface ExternalDiveLog {
  sourceType: ExternalSourceType;
  externalLogId: string;
  deviceId?: string;
  deviceName?: string;
  diveDate: string;
  entryTime?: string;
  exitTime?: string;
  totalDiveTimeMin?: number;
  maxDepthM?: number;
  avgDepthM?: number;
  waterTemperatureC?: number;
  gpsLocation?: { lat: number; lng: number };
  heartRate?: { avg?: number; max?: number };
  diveProfileGraph?: { t: number; depth: number }[];
  equipmentInfo?: string;
  memo?: string;
  rawPayload?: Record<string, unknown>;
}
