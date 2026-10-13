import { policyDocumentsByLocale, signupOptionalConsentKeys, signupRequiredConsentKeys, signupRequiredConsentMap, buildPolicyVersionMap, normalizePolicyLocale, type PolicyLocale } from '../legal/policyCatalog';
import type { ConsentKey, PolicyDocument, PolicyType } from '../models';
import { apiClient } from '../lib/api';

let remoteDocuments: PolicyDocument[] = [];
let remoteSignupPolicies: Record<string, { policyType: PolicyType; version: string; required: boolean }> = {};

export function getAllPolicyDocuments(locale: PolicyLocale = 'ko'): PolicyDocument[] {
  const normalizedLocale = normalizePolicyLocale(locale);
  const fallback = policyDocumentsByLocale[normalizedLocale];
  if (!remoteDocuments.length) return fallback;
  const remoteByType = new Map(remoteDocuments.filter((doc) => doc.locale === normalizedLocale).map((doc) => [doc.type, doc]));
  return fallback.map((doc) => remoteByType.get(doc.type) || doc);
}

export async function refreshRemotePolicyDocuments(locale: PolicyLocale = 'ko'): Promise<PolicyDocument[]> {
  const normalizedLocale = normalizePolicyLocale(locale);
  const response = await apiClient.getSignupConsentPolicies();
  const rows = Array.isArray(response?.data?.documents) ? response.data.documents : [];
  const policyConfig = response?.data?.policies && typeof response.data.policies === 'object'
    ? response.data.policies
    : {};
  remoteSignupPolicies = Object.fromEntries(Object.entries(policyConfig)
    .filter(([, item]: [string, any]) => item?.policyType && item?.version)
    .map(([key, item]: [string, any]) => [key, {
      policyType: String(item.policyType) as PolicyType,
      version: String(item.version),
      required: Boolean(item.required),
    }]));
  remoteDocuments = rows
    .filter((item: any) => item?.type && item?.title && item?.content && item?.version)
    .map((item: any) => ({
      id: `policy-${String(item.type)}-${String(item.version)}`,
      type: String(item.type) as PolicyType,
      title: String(item.title),
      version: String(item.version),
      locale: normalizePolicyLocale(item.locale),
      content: String(item.content),
      requiredForSignup: Boolean(item.requiredForSignup),
      effectiveFrom: String(item.effectiveFrom || item.updatedAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || item.effectiveFrom || new Date().toISOString()),
    }));
  return getAllPolicyDocuments(normalizedLocale);
}

export function getPolicyDocumentByType(type: PolicyType, locale: PolicyLocale = 'ko'): PolicyDocument | null {
  const docs = getAllPolicyDocuments(locale);
  return docs.find((doc) => doc.type === type) || null;
}

export function getLatestPolicyVersionMap(locale: PolicyLocale = 'ko'): Record<PolicyType, string> {
  if (!remoteDocuments.length) return buildPolicyVersionMap(locale);
  return getAllPolicyDocuments(locale).reduce((acc, doc) => {
    acc[doc.type] = doc.version;
    return acc;
  }, {} as Record<PolicyType, string>);
}

export function getSignupConsentDefinition(locale: PolicyLocale = 'ko'): {
  required: { key: ConsentKey; policy: PolicyDocument }[];
  optional: { key: ConsentKey; policy: PolicyDocument }[];
} {
  const docs = getAllPolicyDocuments(locale);
  const byType = docs.reduce((acc, doc) => {
    acc[doc.type] = doc;
    return acc;
  }, {} as Record<PolicyType, PolicyDocument>);

  const required = signupRequiredConsentKeys
    .map((key) => {
      const type = signupRequiredConsentMap[key];
      const remote = remoteSignupPolicies[key];
      const policy = byType[type];
      return { key, policy: policy && remote ? { ...policy, type: remote.policyType, version: remote.version } : policy };
    })
    .filter((item): item is { key: ConsentKey; policy: PolicyDocument } => Boolean(item.policy));

  const optional = signupOptionalConsentKeys
    .map((key) => {
      const type = signupRequiredConsentMap[key];
      const remote = remoteSignupPolicies[key];
      const policy = byType[type];
      return { key, policy: policy && remote ? { ...policy, type: remote.policyType, version: remote.version } : policy };
    })
    .filter((item): item is { key: ConsentKey; policy: PolicyDocument } => Boolean(item.policy));

  return { required, optional };
}
