import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storage } from '../lib/storage';

const zustandStorage = {
  setItem: (name: string, value: string) => storage.set(name, value),
  getItem: (name: string) => storage.getString(name) ?? null,
  removeItem: (name: string) => storage.delete(name),
};

export type SocialProvider = 'google' | 'apple' | 'instagram';

export type BlockedUser = {
  id: string;
  name: string;
  reason?: string;
  blockedAt: string;
};

export type EmergencyContact = {
  name: string;
  phone: string;
  relation: string;
};

export type InsuranceInfo = {
  provider: string;
  policyNumber: string;
  emergencyPhone: string;
  validUntil: string;
};

export type SocialLinkRecord = {
  provider: string;
  linkedAt?: string;
};

interface SettingsFeatureState {
  socialLinks: Record<SocialProvider, { linked: boolean; linkedAt: string }>;
  blockedUsers: BlockedUser[];
  emergencyContact: EmergencyContact;
  insuranceInfo: InsuranceInfo;

  setSocialLinked: (provider: SocialProvider, linked: boolean) => void;
  syncSocialLinks: (links: SocialLinkRecord[]) => void;
  addBlockedUser: (name: string, reason?: string) => { ok: boolean; code?: 'empty' | 'duplicate' };
  removeBlockedUser: (id: string) => void;
  setEmergencyContact: (contact: EmergencyContact) => void;
  setInsuranceInfo: (info: InsuranceInfo) => void;
}

const defaultEmergencyContact: EmergencyContact = {
  name: '',
  phone: '',
  relation: '',
};

const defaultInsuranceInfo: InsuranceInfo = {
  provider: '',
  policyNumber: '',
  emergencyPhone: '',
  validUntil: '',
};

const defaultSocialLinks: Record<SocialProvider, { linked: boolean; linkedAt: string }> = {
  google: { linked: false, linkedAt: '' },
  apple: { linked: false, linkedAt: '' },
  instagram: { linked: false, linkedAt: '' },
};

export const useSettingsFeatureStore = create<SettingsFeatureState>()(
  persist(
    (set, get) => ({
      socialLinks: defaultSocialLinks,
      blockedUsers: [],
      emergencyContact: defaultEmergencyContact,
      insuranceInfo: defaultInsuranceInfo,

      setSocialLinked: (provider, linked) =>
        set((state) => ({
          socialLinks: {
            ...state.socialLinks,
            [provider]: {
              linked,
              linkedAt: linked ? new Date().toISOString() : '',
            },
          },
        })),

      syncSocialLinks: (links) =>
        set(() => {
          const next = { ...defaultSocialLinks };
          links.forEach((item) => {
            const provider = String(item.provider || '').toLowerCase() as SocialProvider;
            if (!Object.prototype.hasOwnProperty.call(next, provider)) return;
            next[provider] = {
              linked: true,
              linkedAt: String(item.linkedAt || new Date().toISOString()),
            };
          });
          return { socialLinks: next };
        }),

      addBlockedUser: (name, reason) => {
        const trimmedName = String(name || '').trim();
        const trimmedReason = String(reason || '').trim();
        if (!trimmedName) return { ok: false, code: 'empty' as const };

        const exists = get()
          .blockedUsers
          .some((item) => item.name.trim().toLowerCase() === trimmedName.toLowerCase());
        if (exists) return { ok: false, code: 'duplicate' as const };

        const next: BlockedUser = {
          id: `blocked-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: trimmedName,
          reason: trimmedReason || undefined,
          blockedAt: new Date().toISOString(),
        };

        set((state) => ({ blockedUsers: [next, ...state.blockedUsers] }));
        return { ok: true };
      },

      removeBlockedUser: (id) =>
        set((state) => ({ blockedUsers: state.blockedUsers.filter((item) => item.id !== id) })),

      setEmergencyContact: (contact) =>
        set({
          emergencyContact: {
            name: String(contact.name || '').trim(),
            phone: String(contact.phone || '').trim(),
            relation: String(contact.relation || '').trim(),
          },
        }),

      setInsuranceInfo: (info) =>
        set({
          insuranceInfo: {
            provider: String(info.provider || '').trim(),
            policyNumber: String(info.policyNumber || '').trim(),
            emergencyPhone: String(info.emergencyPhone || '').trim(),
            validUntil: String(info.validUntil || '').trim(),
          },
        }),
    }),
    {
      name: 'settings-feature-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
