import { apiClient } from '../lib/api';
import { useSettingsFeatureStore, type SocialProvider } from '../stores/settingsFeatureStore';

export type LoginProvider = 'google' | 'apple' | 'kakao' | 'naver' | 'instagram' | 'facebook' | 'email';

const providerMap: Record<LoginProvider, SocialProvider | null> = {
  google: 'google',
  apple: 'apple',
  kakao: 'kakao',
  naver: 'naver',
  instagram: 'instagram',
  facebook: null,
  email: null,
};

function normalizeLinkedProvider(value: unknown): LoginProvider | null {
  const provider = String(value || '').trim().toLowerCase();
  if (provider === 'google' || provider === 'apple' || provider === 'kakao' || provider === 'naver' || provider === 'instagram') return provider;
  return null;
}

export async function listConnectedProviders(): Promise<LoginProvider[]> {
  try {
    const result = await apiClient.getOAuthLinks();
    const linked = new Set<LoginProvider>();
    for (const item of result.links || []) {
      const provider = normalizeLinkedProvider(item.provider);
      if (provider) linked.add(provider);
    }
    if (linked.size > 0) {
      useSettingsFeatureStore.getState().syncSocialLinks(
        [...linked]
          .map((provider) => {
            const mapped = providerMap[provider];
            if (!mapped) return null;
            return { provider: mapped, linkedAt: new Date().toISOString() };
          })
          .filter(Boolean) as { provider: SocialProvider; linkedAt?: string }[]
      );
    }
    return [...linked];
  } catch {
    const snapshot = useSettingsFeatureStore.getState().socialLinks;
    return (Object.entries(snapshot) as [SocialProvider, { linked: boolean; linkedAt: string }][])
      .filter(([, item]) => item.linked)
      .map(([provider]) => provider)
      .filter((provider) => provider === 'google' || provider === 'apple' || provider === 'kakao' || provider === 'naver' || provider === 'instagram') as LoginProvider[];
}
}

export async function ensureProviderConnected(provider: LoginProvider): Promise<boolean> {
  if (provider === 'email') return true;
  const linkedProviders = await listConnectedProviders();
  return linkedProviders.includes(provider);
}

export async function syncConnectedProvidersFromServer(): Promise<LoginProvider[]> {
  return listConnectedProviders();
}
