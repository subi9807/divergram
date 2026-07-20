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

export async function connectShearwaterAccount(authCode?: string): Promise<{ connected: boolean; accountLabel: string }> {
  try {
    const result = await apiClient.connectExternalProvider('shearwater', { authCode });
    updateProviderTokenFromAuthResult('shearwater', result);
    const accountLabel = result.accountLabel || 'Shearwater Diver';
    const isMockToken = String(result.accessToken || '').toLowerCase().startsWith('mock_');
    return { connected: result.connected, accountLabel: isMockToken ? `${accountLabel} (mock)` : accountLabel };
  } catch (error: any) {
    if (__DEV__ && isEndpointUnavailable(error)) {
      return { connected: true, accountLabel: 'Shearwater Diver (mock)' };
    }
    throw error;
  }
}

export async function disconnectShearwaterAccount(): Promise<void> {
  const tokenState = getProviderTokenState('shearwater');
  try {
    await apiClient.disconnectExternalProvider('shearwater', {
      providerUserId: tokenState?.providerUserId,
      accessToken: tokenState?.accessToken,
      refreshToken: tokenState?.refreshToken,
    });
  } catch (error: any) {
    if (!isEndpointUnavailable(error)) throw error;
  } finally {
    clearProviderTokenState('shearwater');
  }
}

export async function fetchShearwaterDiveLogs(): Promise<ExternalDiveLog[]> {
  try {
    const accessToken = await ensureProviderAccessToken('shearwater');
    const rows = await apiClient.getExternalProviderDiveLogs('shearwater', {
      limit: 100,
      accessToken,
    });
    const mapped = mapProviderLogs('shearwater', rows);
    return mapped.length ? mapped : (__DEV__ ? buildMockExternalLogs('shearwater') : []);
  } catch (error: any) {
    if (__DEV__ && isEndpointUnavailable(error)) {
      return buildMockExternalLogs('shearwater');
    }
    throw error;
  }
}
