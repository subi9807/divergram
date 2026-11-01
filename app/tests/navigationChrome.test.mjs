import test from 'node:test';
import assert from 'node:assert/strict';
import { HEADER_BOTTOM_RADIUS, floatingTabGeometry } from '../src/utils/navigationChrome.ts';

test('rounded navigation retains home-indicator and landscape safe areas', () => {
  assert.equal(HEADER_BOTTOM_RADIUS, 22);
  for (const insets of [{ bottom: 34, left: 0, right: 0 }, { bottom: 0, left: 0, right: 0 }, { bottom: 21, left: 59, right: 59 }]) {
    const style = floatingTabGeometry(insets);
    assert.equal(style.borderRadius, 24);
    assert(style.marginBottom >= insets.bottom);
    assert(style.marginLeft >= insets.left);
    assert(style.marginRight >= insets.right);
    assert(style.height - style.paddingTop - style.paddingBottom >= 54);
    assert.equal(style.position, undefined);
  }
});

test('wide layouts center the floating tab bar without exceeding its maximum width', () => {
  const style = floatingTabGeometry({ bottom: 20, left: 0, right: 0 }, 1366);
  assert.equal(style.marginLeft, 303);
  assert.equal(style.marginRight, 303);
});
