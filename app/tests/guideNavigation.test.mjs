import test from 'node:test';
import assert from 'node:assert/strict';
import { getGuideNeighbors } from '../src/utils/guideNavigation.ts';

const a = { id: 'a', title: 'A' }, b = { id: 'b', title: 'B' }, c = { id: 'c', title: 'C' };
const pages = offset => Promise.resolve(offset === 0 ? { data: [a, b], nextOffset: 2 } : { data: [b, c], nextOffset: null });
test('first article has only next', async () => assert.deepEqual(await getGuideNeighbors('a', pages), { previous: null, next: b }));
test('page boundary and duplicate rows', async () => assert.deepEqual(await getGuideNeighbors('b', pages), { previous: a, next: c }));
test('last article has only previous', async () => assert.deepEqual(await getGuideNeighbors('c', pages), { previous: b, next: null }));
test('missing article has no neighbors', async () => assert.deepEqual(await getGuideNeighbors('missing', pages), { previous: null, next: null }));
test('single article and invalid pagination stop', async () => assert.deepEqual(await getGuideNeighbors('a', async () => ({ data: [a], nextOffset: 0 })), { previous: null, next: null }));
test('errors reach the retry UI', async () => assert.rejects(getGuideNeighbors('a', async () => { throw new Error('offline'); }), /offline/));
