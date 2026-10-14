import assert from 'node:assert/strict';
import test from 'node:test';

import { EMAIL_COMPANY_NAME, normalizeEmailSender, stripEmailBrandMarkdown } from './emailBrand.js';

test('removes markdown emphasis around the company name', () => {
  assert.equal(stripEmailBrandMarkdown('**METAbyTREE**'), EMAIL_COMPANY_NAME);
  assert.equal(stripEmailBrandMarkdown('**METAbyTREE** <support@metabytree.com>'), 'METAbyTREE <support@metabytree.com>');
});

test('uses the plain company name for a bare sender address', () => {
  assert.equal(normalizeEmailSender('support@metabytree.com'), 'METAbyTREE <support@metabytree.com>');
  assert.equal(normalizeEmailSender('**METAbyTREE** <support@metabytree.com>'), 'METAbyTREE <support@metabytree.com>');
});
