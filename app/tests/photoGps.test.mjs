import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExifGps } from '../src/utils/photoGps.ts';

test('EXIF decimal degrees preserve valid zero coordinates', () => {
  assert.deepEqual(parseExifGps({ GPSLatitude: 0, GPSLongitude: 0 }), { lat: 0, lng: 0 });
});
test('DMS rational values and hemisphere references are decoded correctly', () => {
  assert.deepEqual(parseExifGps({ GPSLatitude: ['33/1', '30/1', '0/1'], GPSLatitudeRef: 'S', GPSLongitude: '126/1 30/1 0/1', GPSLongitudeRef: 'E' }), { lat: -33.5, lng: 126.5 });
});
test('missing, out-of-range and malformed coordinates never become locations', () => {
  for (const exif of [null, {}, { GPSLatitude: '', GPSLongitude: '' }, { GPSLatitude: 91, GPSLongitude: 126 }, { GPSLatitude: '1/0', GPSLongitude: 1 }, { GPSLatitude: [30, 90, 0], GPSLongitude: 1 }, { GPSLatitude: 'bad 30 40', GPSLongitude: 1 }, { GPSLatitude: 33, GPSLongitude: 1, GPSLatitudeRef: 'W' }]) assert.equal(parseExifGps(exif), null);
});
