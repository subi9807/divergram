import test from 'node:test';
import assert from 'node:assert/strict';
import { diveGuidePublicationIssues, localizedDiveGuide, normalizeDiveGuideInput } from './diveGuide.js';

const translations = Object.fromEntries(['ko', 'en', 'ja', 'zh'].map((locale) => [locale, { title: `${locale} title`, summary: `${locale} summary`, body: `${locale} body` }]));

test('published dive guides require media and all supported translations', () => {
  assert.deepEqual(diveGuidePublicationIssues({ translations, coverImageUrl: 'https://example.com/cover.jpg' }), []);
  assert.deepEqual(diveGuidePublicationIssues({ translations: { ko: translations.ko } }), [
    'translation_en_required', 'translation_ja_required', 'translation_zh_required', 'guide_media_required',
  ]);
});

test('published dive guide input is normalized', () => {
  const value = normalizeDiveGuideInput({ category: 'safety', translations, coverImageUrl: 'https://example.com/cover.jpg', status: 'published', featured: true, sortOrder: 12 });
  assert.equal(value.status, 'published');
  assert.equal(value.featured, true);
  assert.equal(value.sortOrder, 12);
});

test('localized guide never falls back to another language', () => {
  const row = { id: 'guide-1', category: 'skills', translations: { ko: translations.ko }, cover_image_url: '', video_url: '', featured: false };
  assert.equal(localizedDiveGuide(row, 'ja'), null);
  assert.equal(localizedDiveGuide({ ...row, translations }, 'ja').title, 'ja title');
});
