export const DIVING_DISCIPLINE_OPTIONS = ['scuba', 'freediving'] as const;

export const DIVING_LICENSE_STATUS_OPTIONS = ['draft', 'active', 'pending_review', 'expired', 'revoked'] as const;

export type DivingDiscipline = (typeof DIVING_DISCIPLINE_OPTIONS)[number];
export type DivingLicenseStatus = (typeof DIVING_LICENSE_STATUS_OPTIONS)[number];

export function normalizeDivingDiscipline(value: unknown): DivingDiscipline {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'freediving' || text === 'free diving' || text === 'freedive') return 'freediving';
  return 'scuba';
}

export function normalizeDivingLicenseStatus(value: unknown): DivingLicenseStatus {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'active') return 'active';
  if (text === 'pending' || text === 'pending_review' || text === 'reviewing') return 'pending_review';
  if (text === 'expired') return 'expired';
  if (text === 'revoked' || text === 'inactive' || text === 'blocked') return 'revoked';
  return 'draft';
}

export function getDivingDisciplineLabel(discipline: DivingDiscipline) {
  return discipline === 'freediving' ? 'FREEDIVING' : 'SCUBA DIVING';
}

export function getDivingLicenseStatusLabel(status: DivingLicenseStatus) {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'pending_review':
      return 'REVIEWING';
    case 'expired':
      return 'EXPIRED';
    case 'revoked':
      return 'REVOKED';
    default:
      return 'DRAFT';
  }
}

export function getDivingLicenseStatusTone(status: DivingLicenseStatus) {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending_review':
      return 'warning';
    case 'expired':
      return 'danger';
    case 'revoked':
      return 'muted';
    default:
      return 'info';
  }
}

export interface DivingLicense {
  id: string;
  licenseNumber: string;
  userId: string;
  holderName: string;
  profileImageUrl?: string;
  discipline: DivingDiscipline;
  certificationLevel: string;
  issueDate: string;
  expirationDate?: string;
  hasExpiration: boolean;
  maxDepth?: number;
  trainingAgency?: string;
  instructorName?: string;
  instructorNumber?: string;
  emergencyContact?: string;
  verificationUrl?: string;
  walletPassUrl?: string;
  status: DivingLicenseStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DivingLicenseInput = Partial<Omit<DivingLicense, 'id' | 'createdAt' | 'updatedAt'>> & {
  licenseNumber: string;
  userId?: string;
  holderName: string;
  discipline: DivingDiscipline;
  certificationLevel: string;
  issueDate: string;
};
