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

export async function connectSuuntoAccount(authCode?: string): Promise<{ connected: boolean; accountLabel: string }> {
  try {
    const result = await apiClient.connectExternalProvider('suunto', { authCode });
    updateProviderTokenFromAuthResult('suunto', result);
    return { connected: result.connected, accountLabel: result.accountLabel || 'Suunto Diver' };
  } catch (error: any) {
    if (__DEV__ && isEndpointUnavailable(error)) {
      return { connected: true, accountLabel: 'Suunto Diver (mock)' };
    }
    throw error;
  }
}

export async function disconnectSuuntoAccount(): Promise<void> {
  const tokenState = getProviderTokenState('suunto');
  try {
    await apiClient.disconnectExternalProvider('suunto', {
      providerUserId: tokenState?.providerUserId,
      accessToken: tokenState?.accessToken,
      refreshToken: tokenState?.refreshToken,
    });
  } catch (error: any) {
    if (!isEndpointUnavailable(error)) throw error;
  } finally {
    clearProviderTokenState('suunto');
  }
}

export async function fetchSuuntoDiveLogs(): Promise<ExternalDiveLog[]> {
  try {
    const accessToken = await ensureProviderAccessToken('suunto');
    const rows = await apiClient.getExternalProviderDiveLogs('suunto', {
      limit: 100,
      accessToken,
    });
    const mapped = mapProviderLogs('suunto', rows);
    return mapped.length ? mapped : (__DEV__ ? buildMockExternalLogs('suunto') : []);
  } catch (error: any) {
    if (__DEV__ && isEndpointUnavailable(error)) {
      return buildMockExternalLogs('suunto');
    }
    throw error;
  }
}
