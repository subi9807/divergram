import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { PolicyType } from '../../models';
import { PolicyDocumentView } from './PolicyDocumentView';

const policyTypes: PolicyType[] = [
  'terms',
  'privacy',
  'location_terms',
  'location_privacy',
  'community',
  'content_upload',
  'copyright',
  'youth',
  'safety_disclaimer',
  'medical_notice',
  'ai_notice',
  'external_api_notice',
  'bluetooth_notice',
  'cookie',
  'data_retention',
  'account_deletion',
  'report_sanction',
  'illegal_content',
  'report_process',
  'privacy_third_party',
  'privacy_overseas_transfer',
  'marketing_consent',
  'push_consent',
  'age14_notice',
  'ugc_policy',
];

export default function PolicyDocumentDynamicScreen() {
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const parsedType = policyTypes.includes(String(rawType) as PolicyType) ? (String(rawType) as PolicyType) : 'terms';
  return <PolicyDocumentView type={parsedType} />;
}
