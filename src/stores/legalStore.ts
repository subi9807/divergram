import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Consent,
  ConsentKey,
  LegalAgreement,
  ModerationAction,
  ModerationStatus,
  PolicyType,
  Report,
  ReportReason,
  ReportTargetType,
} from '../models';
import { storage } from '../lib/storage';
import { signupRequiredConsentKeys, signupRequiredConsentMap } from '../legal/policyCatalog';

const zustandStorage = {
  setItem: (name: string, value: string) => storage.set(name, value),
  getItem: (name: string) => storage.getString(name) ?? null,
  removeItem: (name: string) => storage.delete(name),
};

interface SubmitReportInput {
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  detail?: string;
}

interface RegisterConsentInput {
  userId: string;
  values: Record<ConsentKey, boolean>;
  versionMap: Record<PolicyType, string>;
}

interface LegalStoreState {
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  consentHistory: Consent[];
  legalAgreements: LegalAgreement[];
  reports: Report[];
  moderationActions: ModerationAction[];
  registerConsents: (input: RegisterConsentInput) => void;
  hasRequiredSignupConsents: (userId: string, versionMap: Record<PolicyType, string>) => boolean;
  submitReport: (input: SubmitReportInput) => Report;
  addModerationAction: (action: Omit<ModerationAction, 'id' | 'createdAt'>) => ModerationAction;
  updateReportStatus: (reportId: string, status: Report['status'], resolutionNote?: string) => void;
  markReportSyncStatus: (reportId: string, syncStatus: NonNullable<Report['syncStatus']>, syncError?: string) => void;
  advanceReportWorkflow: (reportId: string) => { ok: boolean; status?: Report['status']; message?: string };
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeReportTargetId(value: string) {
  return String(value || '').trim().toLowerCase();
}

function pickModerationStatusByReason(reason: ReportReason): ModerationStatus {
  if (reason === 'sexual_content' || reason === 'violence' || reason === 'hate') return 'suspended';
  if (reason === 'dangerous_behavior' || reason === 'impersonation') return 'temporary_limit';
  if (reason === 'copyright' || reason === 'misinformation') return 'upload_limit';
  if (reason === 'spam') return 'warning';
  return 'warning';
}

export const useLegalStore = create<LegalStoreState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      consentHistory: [],
      legalAgreements: [],
      reports: [],
      moderationActions: [],

      registerConsents: ({ userId, values, versionMap }) => {
        const at = nowIso();
        const nextConsents: Consent[] = (Object.keys(values) as ConsentKey[]).map((key) => {
          const policyType = signupRequiredConsentMap[key];
          return {
            userId,
            key,
            agreed: values[key],
            version: versionMap[policyType],
            agreedAt: values[key] ? at : undefined,
            updatedAt: at,
          };
        });

        const nextAgreements: LegalAgreement[] = nextConsents
          .filter((item) => item.agreed)
          .map((item) => ({
            id: makeId('agreement'),
            userId,
            policyType: signupRequiredConsentMap[item.key],
            version: item.version,
            agreedAt: item.agreedAt || at,
          }));

        set((state) => ({
          consentHistory: [
            ...state.consentHistory.filter(
              (item) => !(item.userId === userId && nextConsents.some((next) => next.key === item.key))
            ),
            ...nextConsents,
          ],
          legalAgreements: [...state.legalAgreements, ...nextAgreements],
        }));
      },

      hasRequiredSignupConsents: (userId, versionMap) => {
        const history = get().consentHistory.filter((item) => item.userId === userId);
        return signupRequiredConsentKeys.every((key) => {
          const policyType = signupRequiredConsentMap[key];
          const latest = versionMap[policyType];
          const found = history.find((item) => item.key === key);
          return Boolean(found && found.agreed && found.version === latest);
        });
      },

      submitReport: ({ reporterUserId, targetType, targetId, reason, detail }) => {
        const nowMs = Date.now();
        const normalizedTargetId = String(targetId).trim();
        const dedupeTargetId = normalizeReportTargetId(normalizedTargetId);
        const recentDuplicate = get().reports.find((item) => {
          if (item.reporterUserId !== reporterUserId) return false;
          if (item.targetType !== targetType) return false;
          if (normalizeReportTargetId(String(item.targetId)) !== dedupeTargetId) return false;
          if (item.reason !== reason) return false;
          const createdMs = Date.parse(item.createdAt || '');
          if (!Number.isFinite(createdMs)) return false;
          return nowMs - createdMs < 1000 * 60 * 10;
        });
        if (recentDuplicate) {
          throw new Error('duplicate_report_recent');
        }

        const report: Report = {
          id: makeId('report'),
          reporterUserId,
          targetType,
          targetId: normalizedTargetId,
          reason,
          detail,
          status: 'received',
          syncStatus: 'pending',
          createdAt: nowIso(),
        };
        set((state) => ({ reports: [report, ...state.reports] }));
        return report;
      },

      addModerationAction: ({ reportId, targetUserId, status, reason, startedAt, endsAt }) => {
        const action: ModerationAction = {
          id: makeId('moderation'),
          reportId,
          targetUserId,
          status,
          reason,
          startedAt,
          endsAt,
          createdAt: nowIso(),
        };
        set((state) => ({ moderationActions: [action, ...state.moderationActions] }));
        return action;
      },

      updateReportStatus: (reportId, status, resolutionNote) =>
        set((state) => ({
          reports: state.reports.map((item) =>
            item.id !== reportId
              ? item
              : {
                  ...item,
                  status,
                  reviewedAt: status === 'resolved' || status === 'rejected' ? nowIso() : item.reviewedAt,
                  resolutionNote: resolutionNote ?? item.resolutionNote,
                }
          ),
        })),

      markReportSyncStatus: (reportId, syncStatus, syncError) =>
        set((state) => ({
          reports: state.reports.map((item) =>
            item.id !== reportId
              ? item
              : {
                  ...item,
                  syncStatus,
                  syncError: syncError || undefined,
                }
          ),
        })),

      advanceReportWorkflow: (reportId) => {
        const report = get().reports.find((item) => item.id === reportId);
        if (!report) return { ok: false, message: 'report_not_found' };

        if (report.status === 'received') {
          get().updateReportStatus(reportId, 'reviewing');
          return { ok: true, status: 'reviewing' };
        }

        if (report.status === 'reviewing') {
          const moderationStatus = pickModerationStatusByReason(report.reason);
          const targetUserId = report.targetType === 'user' ? report.targetId : 'unknown_target_user';
          get().addModerationAction({
            reportId,
            targetUserId,
            status: moderationStatus,
            reason: `report_reason:${report.reason}`,
            startedAt: nowIso(),
          });
          get().updateReportStatus(reportId, 'resolved', `auto_moderation:${moderationStatus}`);
          return { ok: true, status: 'resolved' };
        }

        return { ok: false, status: report.status, message: 'already_finalized' };
      },
    }),
    {
      name: 'legal-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        consentHistory: state.consentHistory,
        legalAgreements: state.legalAgreements,
        reports: state.reports,
        moderationActions: state.moderationActions,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
