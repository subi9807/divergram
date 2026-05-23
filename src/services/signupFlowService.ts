export type PendingSignupDraft = {
  email: string;
  password: string;
  name: string;
  contact: string;
  createdAt: string;
};

let pendingSignupDraft: PendingSignupDraft | null = null;

export function setPendingSignupDraft(draft: Omit<PendingSignupDraft, 'createdAt'>) {
  pendingSignupDraft = {
    ...draft,
    createdAt: new Date().toISOString(),
  };
}

export function getPendingSignupDraft(): PendingSignupDraft | null {
  return pendingSignupDraft;
}

export function clearPendingSignupDraft() {
  pendingSignupDraft = null;
}
