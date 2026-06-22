export const CERTIFICATION_AGENCY_PRESETS = [
  'PADI',
  'SSI',
  'CMAS',
  'NAUI',
  'AIDA',
  'RAID',
  'BSAC',
  'PSS',
  'TDI',
  'SDI',
  'MOLCHANOVS',
] as const;

export type CertificationAgency = string;
export type CertificationStatus = 'unregistered' | 'reviewing' | 'verified' | 'rejected';

export function normalizeCertificationAgency(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';
  const upper = text.toUpperCase();
  const preset = CERTIFICATION_AGENCY_PRESETS.find((item) => item.toUpperCase() === upper);
  return preset || text;
}

export interface Certification {
  id: string;
  userId: string;
  agency: CertificationAgency;
  certificationNumber?: string;
  level?: string;
  issuedAt?: string;
  expiresAt?: string;
  imageUrl?: string;
  status: CertificationStatus;
  createdAt: string;
  updatedAt: string;
}
