import { storage } from '../lib/storage';

export type PendingSignupDraft = {
  kind: 'email';
  email: string;
  password: string;
  name: string;
  contact: string;
  createdAt: string;
};

export type PendingSocialSignupDraft = {
  kind: 'social';
  provider: 'google' | 'apple' | 'instagram';
  accessToken: string;
  userInfo?: any;
  providerUserId?: string;
  email?: string;
  name?: string;
  avatar?: string;
  createdAt: string;
};

export type SignupDraft = PendingSignupDraft | PendingSocialSignupDraft;

export type SignupConsentReceipt = {
  key: string;
  policyType: string;
  version: string;
  agreed: boolean;
};

let pendingSignupDraft: SignupDraft | null = null;
const PENDING_SIGNUP_CONSENTS_KEY = 'pending-signup-consents';

export function setPendingSignupDraft(draft: Omit<PendingSignupDraft, 'createdAt' | 'kind'>) {
  pendingSignupDraft = {
    ...draft,
    kind: 'email',
    createdAt: new Date().toISOString(),
  };
}

export function setPendingSocialSignupDraft(draft: Omit<PendingSocialSignupDraft, 'createdAt' | 'kind'>) {
  pendingSignupDraft = { ...draft, kind: 'social', createdAt: new Date().toISOString() };
}

export function getPendingSignupDraft(): SignupDraft | null {
  return pendingSignupDraft;
}

export function clearPendingSignupDraft() {
  pendingSignupDraft = null;
}

export function setPendingSignupConsents(receipts: SignupConsentReceipt[]) {
  storage.set(PENDING_SIGNUP_CONSENTS_KEY, JSON.stringify({ receipts, createdAt: new Date().toISOString() }));
}

export function getPendingSignupConsents(): SignupConsentReceipt[] | null {
  const raw = storage.getString(PENDING_SIGNUP_CONSENTS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { receipts?: SignupConsentReceipt[]; createdAt?: string };
    const createdAt = Date.parse(String(parsed.createdAt || ''));
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 30 * 60 * 1000 || !Array.isArray(parsed.receipts)) {
      clearPendingSignupConsents();
      return null;
    }
    return parsed.receipts;
  } catch {
    clearPendingSignupConsents();
    return null;
  }
}

export function clearPendingSignupConsents() {
  storage.delete(PENDING_SIGNUP_CONSENTS_KEY);
}
