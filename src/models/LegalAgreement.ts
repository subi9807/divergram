export interface LegalAgreement {
  id: string;
  userId: string;
  policyType: string;
  version: string;
  agreedAt: string;
  ipAddress?: string;
  deviceInfo?: string;
}
