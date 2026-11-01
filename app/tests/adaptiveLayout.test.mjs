import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdaptiveLayout } from '../src/utils/adaptiveLayout.ts';

test('adaptive layout classifies phones, foldables and tablets', () => {
  assert.equal(getAdaptiveLayout(390, 844).sizeClass, 'compact');
  assert.equal(getAdaptiveLayout(720, 900).sizeClass, 'medium');
  assert.equal(getAdaptiveLayout(1366, 1024).sizeClass, 'expanded');
});

test('adaptive layout caps wide content and increases grid density', () => {
  const expanded = getAdaptiveLayout(1600, 900);
  assert.equal(expanded.contentMaxWidth, 1200);
  assert.equal(expanded.tabBarMaxWidth, 760);
  assert.equal(expanded.gridColumns, 4);
  assert.equal(expanded.isLandscape, true);
});
