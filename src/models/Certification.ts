export type CertificationAgency = 'PADI' | 'SSI';
export type CertificationStatus = 'unregistered' | 'reviewing' | 'verified' | 'rejected';

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
