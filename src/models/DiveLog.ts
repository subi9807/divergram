import type { MediaFile } from './MediaFile';
import type { MarineWeather } from './MarineWeather';
import type { ExternalSourceType } from './ExternalDiveLog';

export type DiveLogSourceType = 'manual' | ExternalSourceType;
export type DiveLogVisibilityType = 'public' | 'followers' | 'private';
export type DiveLogSyncStatus = 'pending' | 'syncing' | 'done' | 'failed' | 'duplicate' | 'canceled';

export interface DiveLog {
  id: string;
  userId: string;
  sourceType: DiveLogSourceType;
  externalLogId?: string;
  deviceId?: string;
  deviceName?: string;
  diveDate: string;
  entryTime?: string;
  exitTime?: string;
  totalDiveTime?: number;
  maxDepth?: number;
  avgDepth?: number;
  waterTemperature?: number;
  gpsLocation?: { lat: number; lng: number };
  entryLocation?: { lat: number; lng: number };
  exitLocation?: { lat: number; lng: number };
  divePointId?: string;
  divePointName?: string;
  heartRate?: { avg?: number; max?: number };
  diveProfileGraph?: { t: number; depth: number }[];
  equipmentInfo?: string;
  buddyName?: string;
  memo?: string;
  weather?: MarineWeather;
  visibility?: number;
  currentStrength?: number;
  certificationLevel?: string;
  media: MediaFile[];
  tags: string[];
  aiSummary?: string;
  aiCaption?: string;
  isPublic: boolean;
  visibilityType: DiveLogVisibilityType;
  syncStatus: DiveLogSyncStatus;
  createdAt: string;
  updatedAt: string;
}
