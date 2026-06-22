export type ConsentKey =
  | 'terms_required'
  | 'privacy_required'
  | 'location_required'
  | 'age14_required'
  | 'marketing_optional'
  | 'push_optional';

export interface Consent {
  userId: string;
  key: ConsentKey;
  agreed: boolean;
  version: string;
  agreedAt?: string;
  updatedAt: string;
}
