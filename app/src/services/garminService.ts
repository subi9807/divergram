import { apiClient } from '../lib/api';
import type { ExternalDiveLog } from '../models';
import { buildMockExternalLogs, mapProviderLogs } from './externalDiveLogMapper';
import {
  clearProviderTokenState,
  ensureProviderAccessToken,
  getProviderTokenState,
  updateProviderTokenFromAuthResult,
} from './providerTokenService';

function isEndpointUnavailable(error: any) {
  const status = Number(error?.response?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  return status === 404 || status === 405 || status === 501 || message.includes('candidate_request_failed');
}

export async function connectGarminAccount(authCode?: string): Promise<{ connected: boolean; accountLabel: string }> {
  try {
    const result = await apiClient.connectExternalProvider('garmin', { authCode });
    updateProviderTokenFromAuthResult('garmin', result);
    return { connected: result.connected, accountLabel: result.accountLabel || 'Garmin Diver' };
  } catch (error: any) {
    if (__DEV__ && isEndpointUnavailable(error)) {
      return { connected: true, accountLabel: 'Garmin Diver (mock)' };
    }
    throw error;
  }
}

export async function disconnectGarminAccount(): Promise<void> {
  const tokenState = getProviderTokenState('garmin');
  try {
    await apiClient.disconnectExternalProvider('garmin', {
      providerUserId: tokenState?.providerUserId,
      accessToken: tokenState?.accessToken,
      refreshToken: tokenState?.refreshToken,
    });
  } catch (error: any) {
    if (!isEndpointUnavailable(error)) throw error;
  } finally {
    clearProviderTokenState('garmin');
  }
}

export async function fetchGarminDiveLogs(): Promise<ExternalDiveLog[]> {
  try {
    const accessToken = await ensureProviderAccessToken('garmin');
    const rows = await apiClient.getExternalProviderDiveLogs('garmin', {
      limit: 100,
      accessToken,
    });
    const mapped = mapProviderLogs('garmin', rows);
    return mapped.length ? mapped : (__DEV__ ? buildMockExternalLogs('garmin') : []);
  } catch (error: any) {
    if (__DEV__ && isEndpointUnavailable(error)) {
      return buildMockExternalLogs('garmin');
    }
    throw error;
  }
}
