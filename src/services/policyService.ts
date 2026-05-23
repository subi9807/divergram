import { policyDocumentsKo, signupOptionalConsentKeys, signupRequiredConsentKeys, signupRequiredConsentMap, buildPolicyVersionMap } from '../legal/policyCatalog';
import type { ConsentKey, PolicyDocument, PolicyType } from '../models';

export function getAllPolicyDocuments(locale: 'ko' | 'en' = 'ko'): PolicyDocument[] {
  if (locale === 'en') {
    return policyDocumentsKo;
  }
  return policyDocumentsKo;
}

export function getPolicyDocumentByType(type: PolicyType, locale: 'ko' | 'en' = 'ko'): PolicyDocument | null {
  const docs = getAllPolicyDocuments(locale);
  return docs.find((doc) => doc.type === type) || null;
}

export function getLatestPolicyVersionMap(locale: 'ko' | 'en' = 'ko'): Record<PolicyType, string> {
  return buildPolicyVersionMap(locale);
}

export function getSignupConsentDefinition(locale: 'ko' | 'en' = 'ko'): {
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
      return { key, policy: byType[type] };
    })
    .filter((item): item is { key: ConsentKey; policy: PolicyDocument } => Boolean(item.policy));

  const optional = signupOptionalConsentKeys
    .map((key) => {
      const type = signupRequiredConsentMap[key];
      return { key, policy: byType[type] };
    })
    .filter((item): item is { key: ConsentKey; policy: PolicyDocument } => Boolean(item.policy));

  return { required, optional };
}
