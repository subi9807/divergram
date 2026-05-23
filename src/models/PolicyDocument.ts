export type PolicyType =
  | 'terms'
  | 'privacy'
  | 'location_terms'
  | 'location_privacy'
  | 'community'
  | 'content_upload'
  | 'copyright'
  | 'youth'
  | 'safety_disclaimer'
  | 'medical_notice'
  | 'ai_notice'
  | 'external_api_notice'
  | 'bluetooth_notice'
  | 'cookie'
  | 'data_retention'
  | 'account_deletion'
  | 'report_sanction'
  | 'illegal_content'
  | 'report_process'
  | 'privacy_third_party'
  | 'privacy_overseas_transfer'
  | 'marketing_consent'
  | 'push_consent'
  | 'age14_notice'
  | 'ugc_policy';

export interface PolicyDocument {
  id: string;
  type: PolicyType;
  title: string;
  version: string;
  locale: 'ko' | 'en';
  content: string;
  requiredForSignup?: boolean;
  effectiveFrom: string;
  updatedAt: string;
}
