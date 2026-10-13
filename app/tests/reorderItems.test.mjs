import test from 'node:test';
import assert from 'node:assert/strict';
import { reorderItems } from '../src/utils/reorderItems.ts';

test('drag reorder inserts the selected menu at the hovered position', () => {
  const items = ['feed', 'resorts', 'location', 'logs', 'profile'];
  assert.deepEqual(reorderItems(items, 1, 3), ['feed', 'location', 'logs', 'resorts', 'profile']);
  assert.deepEqual(reorderItems(items, 4, 1), ['feed', 'profile', 'resorts', 'location', 'logs']);
  assert.deepEqual(items, ['feed', 'resorts', 'location', 'logs', 'profile']);
});

test('drag reorder ignores invalid and unchanged positions', () => {
  const items = ['feed', 'resorts', 'profile'];
  assert.deepEqual(reorderItems(items, -1, 1), items);
  assert.deepEqual(reorderItems(items, 1, 9), items);
  assert.deepEqual(reorderItems(items, 1, 1), items);
});
