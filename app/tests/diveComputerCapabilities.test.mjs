import test from 'node:test';
import assert from 'node:assert/strict';
import { listDiveComputerCapabilities } from '../src/services/dive-computers/registry.ts';

test('capabilities do not advertise unverified vendor log sync', () => {
  const capabilities = listDiveComputerCapabilities();
  assert.equal(capabilities.some(item => item.logSync === 'supported'), false);
  capabilities[0].reason = 'changed';
  assert.notEqual(listDiveComputerCapabilities()[0].reason, 'changed');
});

test('BLE discovery is separate from verified log protocol support', () => {
  const generic = listDiveComputerCapabilities().find(item => item.transport === 'bluetooth');
  assert.equal(generic.discovery, 'supported');
  assert.equal(generic.logSync, 'unsupported');
});
