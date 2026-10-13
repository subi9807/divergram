import test from 'node:test';
import assert from 'node:assert/strict';
import { readPhotoMetadata, uniquePhotoLocations } from '../src/utils/photoGps.ts';

test('missing metadata stays unknown, never becomes import time', () => {
  const value = readPhotoMetadata(null);
  assert.equal(value.capturedAt, null);
  assert.equal(value.capturedLocal, null);
  assert.equal(value.gps, null);
});
test('EXIF original wall clock requires explicit offset for UTC', () => {
  const exif = { DateTimeOriginal: '2026:09:06 00:15:30' };
  assert.equal(readPhotoMetadata(exif).capturedAt, null);
  assert.equal(readPhotoMetadata(exif).capturedLocal, '2026-09-06T00:15:30');
  assert.equal(readPhotoMetadata({ ...exif, OffsetTimeOriginal: '+09:00' }).capturedAt, '2026-09-05T15:15:30.000Z');
  assert.equal(readPhotoMetadata({ ...exif, OffsetTimeOriginal: '-03:30' }).capturedAt, '2026-09-06T03:45:30.000Z');
});
test('malformed dates, offsets and orientation remain unknown', () => {
  for (const value of ['2026:02:30 10:00:00', '2026:09:06 24:00:00', 'garbage']) assert.equal(readPhotoMetadata({ DateTimeOriginal: value }).capturedLocal, null);
  for (const value of ['+14:01', '+09:60', 'UTC', '+99:00']) assert.equal(readPhotoMetadata({ OffsetTimeOriginal: value }).utcOffset, null);
  assert.equal(readPhotoMetadata({ Orientation: 9 }).orientation, null);
  assert.equal(readPhotoMetadata({ Orientation: '6', Make: ' Apple ', Model: 'iPhone' }).orientation, 6);
});
test('original time is not replaced with filesystem modification time', () => {
  assert.equal(readPhotoMetadata({ DateTime: '2026:09:06 10:00:00' }).capturedLocal, null);
});
test('GPS suggestions deduplicate identical locations but retain conflicts', () => {
  assert.deepEqual(uniquePhotoLocations([{ gps: null }, { gps: { lat: 0, lng: 0 } }, { gps: { lat: 0, lng: 0 } }, { gps: { lat: 1, lng: 1 } }]), [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]);
});
