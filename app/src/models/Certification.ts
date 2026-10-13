export type CertificationDiscipline = 'scuba' | 'freediving';

export const CERTIFICATION_AGENCIES: Record<CertificationDiscipline, readonly string[]> = {
  scuba: ['PADI', 'SSI', 'NAUI', 'CMAS', 'SDI', 'TDI', 'RAID', 'BSAC', 'IANTD', 'GUE', 'NASE', 'PSS', 'SNSI', 'PSAI'],
  freediving: ['AIDA', 'MOLCHANOVS', 'SSI FREEDIVING', 'PADI FREEDIVER', 'CMAS', 'RAID FREEDIVING', 'APNEA ACADEMY', 'PURE APNEA'],
};

export const CERTIFICATION_AGENCY_PRESETS = Array.from(new Set(Object.values(CERTIFICATION_AGENCIES).flat()));

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
  discipline?: CertificationDiscipline;
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
