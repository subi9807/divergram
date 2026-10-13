import test from 'node:test';
import assert from 'node:assert/strict';
import { isFishTaxon, isReusableCommonsLicense, localizedCommonName, marineSpeciesSearchResponse, normalizeSpeciesSearchQuery, plainText } from './marineSpeciesSearch.js';

test('species queries are bounded and normalized', () => {
  assert.equal(normalizeSpeciesSearchQuery('  whale   shark  '), 'whale shark');
  assert.equal(normalizeSpeciesSearchQuery('Ａｍｐｈｉｐｒｉｏｎ'), 'Amphiprion');
  assert.equal(normalizeSpeciesSearchQuery('x'.repeat(100)).length, 80);
});

test('common names prefer the app language regardless of the search language', () => {
  const taxon = {
    name: 'Amphiprion clarkii',
    preferred_common_name: 'Clark\'s Anemonefish',
    names: [
      { name: 'Clark\'s Anemonefish', locale: 'en', is_valid: true },
      { name: 'クマノミ', locale: 'ja', is_valid: true },
      { name: '흰동가리돔', locale: 'ko', is_valid: true },
      { name: '克氏双锯鱼', locale: 'zh-CN', is_valid: true },
    ],
  };
  assert.equal(localizedCommonName(taxon, 'ko'), '흰동가리돔');
  assert.equal(localizedCommonName(taxon, 'ja-JP'), 'クマノミ');
  assert.equal(localizedCommonName(taxon, 'zh'), '克氏双锯鱼');
  assert.equal(localizedCommonName(taxon, 'fr'), 'Clark\'s Anemonefish');
});

test('ray, shark and ray-finned fish ancestry is accepted', () => {
  assert.equal(isFishTaxon({ ancestor_ids: [1, 47178] }), true);
  assert.equal(isFishTaxon({ ancestor_ids: [1, 47273] }), true);
  assert.equal(isFishTaxon({ iconic_taxon_name: 'Mollusca', ancestor_ids: [1] }), false);
});

test('only reusable Commons licenses and plain attribution are returned', () => {
  assert.equal(isReusableCommonsLicense('CC BY-SA 4.0'), true);
  assert.equal(isReusableCommonsLicense('CC BY-NC 4.0'), false);
  assert.equal(plainText('<a>User</a> &amp; diver'), 'User & diver');
  assert.equal(marineSpeciesSearchResponse({ id: 12, name: 'Rhincodon typus', rank: 'species' }).providerUrl, 'https://www.inaturalist.org/taxa/12');
});
