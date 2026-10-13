import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('bottom menu editor has complete localized controls in all supported languages', () => {
  let expected;
  for (const locale of ['ko', 'en', 'ja', 'zh']) {
    const copy = JSON.parse(fs.readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url))).bottomMenuEditor;
    const keys = Object.keys(copy).sort();
    if (expected) assert.deepEqual(keys, expected);
    expected = keys;
    for (const value of Object.values(copy)) assert(value.trim());
    for (const key of ['up', 'down', 'remove', 'add']) assert(copy[key].includes('{{name}}'));
    if (locale !== 'ko') assert(!/[가-힣]/.test(JSON.stringify(copy)));
  }
});
