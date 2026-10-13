import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLinuxNetworkBytes } from './adminCore.js';

test('Linux network totals exclude loopback and sum receive/transmit bytes', () => {
  const sample = `Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 100 1 0 0 0 0 0 0 200 2 0 0 0 0 0 0
  eth0: 1048576 10 0 0 0 0 0 0 2097152 20 0 0 0 0 0 0
 wlan0: 524288 5 0 0 0 0 0 0 262144 3 0 0 0 0 0 0`;

  assert.deepEqual(parseLinuxNetworkBytes(sample), {
    inBytes: 1572864,
    outBytes: 2359296,
  });
});
