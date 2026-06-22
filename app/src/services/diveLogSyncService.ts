import { apiClient } from '../lib/api';
import type { DiveLog, ExternalDiveLog } from '../models';
import { mockDiveLogs } from '../mock/divergramExpansionMock';
import { fetchGarminDiveLogs } from './garminService';
import { fetchShearwaterDiveLogs } from './shearwaterService';
import { fetchSuuntoDiveLogs } from './suuntoService';
import { getProviderTokenState } from './providerTokenService';

export type ExternalProviderType = 'garmin' | 'suunto' | 'shearwater';

export type ExternalSyncResult = {
  provider: ExternalProviderType;
  fetched: number;
  imported: DiveLog[];
  duplicateCount: number;
  failedCount: number;
  status: 'completed' | 'failed';
  errorMessage?: string;
  syncedAt: string;
};

const EXTERNAL_PROVIDER_SET = new Set<ExternalProviderType>(['garmin', 'suunto', 'shearwater']);

export function convertExternalToDiveLog(input: ExternalDiveLog, userId: string): DiveLog {
  const now = new Date().toISOString();
  return {
    id: `${input.sourceType}-${input.externalLogId}`,
    userId,
    sourceType: input.sourceType,
    externalLogId: input.externalLogId,
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    diveDate: input.diveDate,
    entryTime: input.entryTime,
    exitTime: input.exitTime,
    totalDiveTime: input.totalDiveTimeMin,
    maxDepth: input.maxDepthM,
    avgDepth: input.avgDepthM,
    waterTemperature: input.waterTemperatureC,
    gpsLocation: input.gpsLocation,
    heartRate: input.heartRate,
    diveProfileGraph: input.diveProfileGraph,
    equipmentInfo: input.equipmentInfo,
    memo: input.memo,
    media: [],
    tags: [],
    isPublic: false,
    visibilityType: 'followers',
    syncStatus: 'done',
    createdAt: now,
    updatedAt: now,
  };
}

export function isDuplicateDiveLog(logs: DiveLog[], sourceType: DiveLog['sourceType'], externalLogId?: string): boolean {
  if (!externalLogId) return false;
  return logs.some((item) => item.sourceType === sourceType && item.externalLogId === externalLogId);
}

async function retry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i === attempts) break;
    }
  }
  throw lastError;
}

async function fetchByProvider(provider: ExternalProviderType): Promise<ExternalDiveLog[]> {
  if (provider === 'garmin') return fetchGarminDiveLogs();
  if (provider === 'suunto') return fetchSuuntoDiveLogs();
  return fetchShearwaterDiveLogs();
}

async function listLinkedProviders(): Promise<ExternalProviderType[]> {
  const linkedProviders = new Set<ExternalProviderType>();

  try {
    const result = await apiClient.getOAuthLinks();
    for (const item of result.links || []) {
      const provider = String(item?.provider || '').trim().toLowerCase();
      if (EXTERNAL_PROVIDER_SET.has(provider as ExternalProviderType)) {
        linkedProviders.add(provider as ExternalProviderType);
      }
    }
  } catch {
    // 서버 연동이 없어도 로컬 토큰 상태를 기준으로 진행한다.
  }

  for (const provider of EXTERNAL_PROVIDER_SET) {
    if (getProviderTokenState(provider)) linkedProviders.add(provider);
  }

  return [...linkedProviders];
}

export async function syncExternalDiveLogs(params: {
  provider: ExternalProviderType;
  userId: string;
  existingLogs: DiveLog[];
}): Promise<ExternalSyncResult> {
  const { provider, userId, existingLogs } = params;
  try {
    const externalLogs = await retry(() => fetchByProvider(provider), 1);
    const imported: DiveLog[] = [];
    let duplicateCount = 0;

    for (const row of externalLogs) {
      if (isDuplicateDiveLog(existingLogs, row.sourceType, row.externalLogId)) {
        duplicateCount += 1;
        continue;
      }
      imported.push(convertExternalToDiveLog(row, userId));
    }

    return {
      provider,
      fetched: externalLogs.length,
      imported,
      duplicateCount,
      failedCount: 0,
      status: 'completed',
      syncedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      provider,
      fetched: 0,
      imported: [],
      duplicateCount: 0,
      failedCount: 1,
      status: 'failed',
      errorMessage: String(error?.message || 'sync_failed'),
      syncedAt: new Date().toISOString(),
    };
  }
}

export async function getImportedDiveLogs(): Promise<DiveLog[]> {
  try {
    const providers = await listLinkedProviders();
    const importedLogs: DiveLog[] = [];

    for (const provider of providers) {
      const rows = await fetchByProvider(provider);
      for (const row of rows) {
        const next = convertExternalToDiveLog(row, 'me');
        if (!isDuplicateDiveLog(importedLogs, next.sourceType, next.externalLogId)) {
          importedLogs.push(next);
        }
      }
    }

    if (importedLogs.length > 0) {
      return importedLogs.sort((a, b) => Date.parse(String(b.createdAt || b.updatedAt || '')) - Date.parse(String(a.createdAt || a.updatedAt || '')));
    }
  } catch {
    // fallback below
  }

  return mockDiveLogs;
}

export async function importManualDiveLogs(userId = 'me'): Promise<DiveLog[]> {
  const stamp = new Date();
  const date = stamp.toISOString().slice(0, 10);
  const now = stamp.toISOString();
  const short = `${Date.now()}`.slice(-6);
  return [
    {
      id: `manual-import-${short}-1`,
      userId,
      sourceType: 'manual',
      diveDate: date,
      entryTime: '09:30',
      exitTime: '10:12',
      totalDiveTime: 42,
      maxDepth: 17.8,
      avgDepth: 10.4,
      waterTemperature: 22,
      divePointName: 'Jeju Munseom',
      memo: '수동 가져오기 샘플 로그 #1',
      media: [],
      tags: ['manual', 'scuba'],
      isPublic: false,
      visibilityType: 'followers',
      syncStatus: 'done',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `manual-import-${short}-2`,
      userId,
      sourceType: 'manual',
      diveDate: date,
      entryTime: '14:20',
      exitTime: '14:58',
      totalDiveTime: 38,
      maxDepth: 13.2,
      avgDepth: 7.9,
      waterTemperature: 23,
      divePointName: 'Amed Reef',
      memo: '수동 가져오기 샘플 로그 #2',
      media: [],
      tags: ['manual', 'freediving'],
      isPublic: true,
      visibilityType: 'public',
      syncStatus: 'done',
      createdAt: now,
      updatedAt: now,
    },
  ];
}
