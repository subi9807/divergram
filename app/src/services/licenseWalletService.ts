import { apiClient } from '../lib/api';
import i18n from '../lib/i18n';

export type AppleWalletPassRequest = {
  licenseId: string;
};

export type AppleWalletPassResponse = {
  ready: boolean;
  message: string;
  passUrl?: string;
};

export type LicenseWalletPassResponse = AppleWalletPassResponse;

export async function getAppleWalletPassStatus(): Promise<Pick<AppleWalletPassResponse, 'ready' | 'message'>> {
  try {
    const payload = await apiClient.getAppleWalletPassStatus();
    return { ready: payload.ready, message: String(payload?.message || '') };
  } catch (error: any) {
    return {
      ready: false,
      message: String(error?.response?.data?.message || i18n.t('licenseManagement.walletStatusFailed')),
    };
  }
}

export async function requestAppleWalletPass(request: AppleWalletPassRequest): Promise<AppleWalletPassResponse> {
  try {
    const payload = await apiClient.createAppleWalletPass(request.licenseId);
    return {
      ready: payload.ready,
      message: String(payload?.message || i18n.t('licenseManagement.walletReady')),
      passUrl: String(payload?.passUrl || '').trim() || undefined,
    };
  } catch (error: any) {
    return {
      ready: false,
      message: String(error?.response?.data?.message || i18n.t('licenseManagement.walletUnavailable')),
    };
  }
}

export async function requestGoogleWalletPass(request: AppleWalletPassRequest): Promise<LicenseWalletPassResponse> {
  try {
    const payload = await apiClient.createGoogleWalletPass(request.licenseId);
    return {
      ready: payload.ready,
      message: String(payload?.message || i18n.t('licenseManagement.walletReady')),
      passUrl: String(payload?.passUrl || '').trim() || undefined,
    };
  } catch (error: any) {
    return {
      ready: false,
      message: String(error?.response?.data?.message || i18n.t('licenseManagement.walletUnavailable')),
    };
  }
}
