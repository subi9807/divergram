import test from 'node:test';
import assert from 'node:assert/strict';
import { policyDocumentsByLocale } from '../src/legal/policyCatalog.ts';

const byType = (locale, type) => policyDocumentsByLocale[locale].find((document) => document.type === type);

test('app information policies use the current version in every locale', () => {
  for (const locale of ['ko', 'en', 'ja', 'zh']) {
    for (const type of ['terms', 'privacy', 'location_terms', 'community', 'safety_disclaimer', 'ai_notice']) {
      assert.equal(byType(locale, type)?.version, '2026.09.11');
      assert.ok((byType(locale, type)?.content || '').length > 100);
    }
  }
});

test('terms distinguish store subscriptions from resort deposit payments', () => {
  const terms = byType('en', 'terms')?.content || '';
  assert.match(terms, /App Store or Google Play/);
  assert.match(terms, /processed by PayPal/);
  assert.match(terms, /not App Store or Google Play in-app purchases/);
});

test('non-Korean policies never fall back to Korean copy', () => {
  for (const locale of ['en', 'ja', 'zh']) {
    const content = policyDocumentsByLocale[locale].map((document) => `${document.title}\n${document.content}`).join('\n');
    assert.doesNotMatch(content, /[가-힣]/);
  }
});

test('privacy and AI notices identify the support contact', () => {
  assert.match(byType('ko', 'privacy')?.content || '', /support@metabytree\.com/);
  assert.match(byType('en', 'ai_notice')?.content || '', /support@metabytree\.com/);
});
