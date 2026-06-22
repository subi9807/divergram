import { apiClient, type ExternalProviderAuthResult, type ExternalProviderKey } from '../lib/api';
import { storage } from '../lib/storage';

export type ProviderTokenState = {
  provider: ExternalProviderKey;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  providerUserId?: string;
  accountLabel?: string;
  linkedAt: string;
  updatedAt: string;
};

function tokenStorageKey(provider: ExternalProviderKey) {
  return `provider_token_${provider}`;
}

function toIso(value: unknown): string | undefined {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function sanitizeTokenState(input: Partial<ProviderTokenState>, provider: ExternalProviderKey): ProviderTokenState {
  const now = new Date().toISOString();
  return {
    provider,
    accessToken: String(input.accessToken || '').trim() || undefined,
    refreshToken: String(input.refreshToken || '').trim() || undefined,
    expiresAt: toIso(input.expiresAt),
    providerUserId: String(input.providerUserId || '').trim() || undefined,
    accountLabel: String(input.accountLabel || '').trim() || undefined,
    linkedAt: toIso(input.linkedAt) || now,
    updatedAt: now,
  };
}

export function getProviderTokenState(provider: ExternalProviderKey): ProviderTokenState | null {
  const raw = storage.getString(tokenStorageKey(provider));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProviderTokenState>;
    return sanitizeTokenState(parsed, provider);
  } catch {
    storage.delete(tokenStorageKey(provider));
    return null;
  }
}

export function setProviderTokenState(provider: ExternalProviderKey, next: Partial<ProviderTokenState>) {
  const base = getProviderTokenState(provider);
  const merged = sanitizeTokenState({ ...(base || {}), ...next, provider }, provider);
  storage.set(tokenStorageKey(provider), JSON.stringify(merged));
  return merged;
}

export function clearProviderTokenState(provider: ExternalProviderKey) {
  storage.delete(tokenStorageKey(provider));
}

export function updateProviderTokenFromAuthResult(provider: ExternalProviderKey, result: ExternalProviderAuthResult) {
  return setProviderTokenState(provider, {
    provider,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAt,
    providerUserId: result.providerUserId,
    accountLabel: result.accountLabel,
  });
}

export function isProviderTokenExpired(state: ProviderTokenState | null, skewMs = 120000): boolean {
  if (!state?.expiresAt) return false;
  const expiresAt = new Date(state.expiresAt).getTime();
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() + Math.max(0, skewMs) >= expiresAt;
}

export async function ensureProviderAccessToken(provider: ExternalProviderKey): Promise<string | undefined> {
  const current = getProviderTokenState(provider);
  if (!current?.accessToken && !current?.refreshToken) return undefined;
  if (!isProviderTokenExpired(current)) return current?.accessToken;
  if (!current?.refreshToken) return current?.accessToken;

  try {
    const refreshed = await apiClient.refreshExternalProviderToken(provider, {
      refreshToken: current.refreshToken,
      accessToken: current.accessToken,
      providerUserId: current.providerUserId,
    });
    const next = updateProviderTokenFromAuthResult(provider, refreshed);
    return next.accessToken || current.accessToken;
  } catch {
    return current.accessToken;
  }
}
