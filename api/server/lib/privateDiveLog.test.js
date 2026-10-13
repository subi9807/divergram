import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDivePatch, createDiveDocument, validateDiveFields, validDiveLogId } from './privateDiveLog.js';

const input = { id: 'log-1', sourceType: 'bluetooth', maxDepth: 24, totalDiveTime: 45, tags: [], media: [] };

test('private logs preserve missing measurements and derive device provenance from source type', () => {
  const doc = createDiveDocument({ ...input, userId: 'victim', isPublic: true, fieldSources: { maxDepth: 'DIVE_COMPUTER' }, waterTemperature: undefined }, 'owner');
  assert.equal(doc.userId, 'owner');
  assert.equal(doc.isPublic, false);
  assert.equal(doc.visibilityType, 'private');
  assert.equal(doc.diveDate, '');
  assert.equal('waterTemperature' in doc, false);
  assert.equal(doc.fieldSources.maxDepth, 'DIVE_COMPUTER');
});

test('corrections do not mutate original documents; only corrected fields become USER', () => {
  const original = createDiveDocument(input, 'owner');
  const revised = applyDivePatch(original, { maxDepth: 22, memo: 'Correction', totalDiveTime: null });
  assert.equal(original.maxDepth, 24);
  assert.equal(original.fieldSources.maxDepth, 'DIVE_COMPUTER');
  assert.equal(revised.maxDepth, 22);
  assert.equal(revised.totalDiveTime, null);
  assert.equal(revised.fieldSources.maxDepth, 'USER');
});

test('patch cannot rewrite identity, provenance or direct publication state', () => {
  for (const patch of [null, [], {}, { id: 'other' }, { userId: 'other' }, { fieldSources: {} }, { sourceType: 'manual' }, { isPublic: true }]) {
    assert.throws(() => applyDivePatch(createDiveDocument(input, 'owner'), patch));
  }
});

test('zero and null are distinct; invalid dates, units and locations are rejected', () => {
  assert.deepEqual(validateDiveFields({ maxDepth: 0, totalDiveTime: null }), { maxDepth: 0, totalDiveTime: null });
  for (const fields of [{ diveDate: '2026-02-30' }, { entryTime: '24:00' }, { maxDepth: '24' }, { maxDepth: -1 }, { totalDiveTime: 2700 }, { gpsLocation: { lat: 91, lng: 0 } }, { maxDepth: Infinity }, { tags: Array(51).fill('a') }]) assert.throws(() => validateDiveFields(fields));
  assert.equal(validDiveLogId('../secret'), false);
  assert.equal(validDiveLogId('garmin:123-456'), true);
});

test('only uploaded HTTPS media is accepted, local file paths are not persisted in effective data', () => {
  const media = { id: 'photo', type: 'image', url: 'https://example.com/photo.jpg', localUri: 'file:///private/photo.jpg' };
  assert.equal('localUri' in validateDiveFields({ media: [media] }).media[0], false);
  assert.throws(() => validateDiveFields({ media: [{ ...media, url: 'file:///photo.jpg' }] }));
});

test('unchanged fields retain their source when saving a mixed patch', () => {
  const original = createDiveDocument(input, 'owner');
  const result = applyDivePatch(original, { maxDepth: 24, memo: 'new' });
  assert.equal(result.fieldSources.maxDepth, 'DIVE_COMPUTER');
  assert.equal(result.fieldSources.memo, 'USER');
});

test('private photo metadata survives validation without trusting claimed UTC or source', () => {
  const photoMetadata = { source: 'VERIFIED', capturedLocal: '2026-09-06T00:00:00', utcOffset: '+09:00', capturedAt: 'fake', gps: { lat: 0, lng: 0 } };
  const media = { id: 'photo', type: 'image', url: 'https://example.com/image.jpg', photoMetadata };
  const saved = validateDiveFields({ media: [media] }).media[0].photoMetadata;
  assert.equal(saved.capturedAt, '2026-09-05T15:00:00.000Z');
  assert.equal(saved.source, 'PHOTO_EXIF');
  assert.deepEqual(saved.gps, { lat: 0, lng: 0 });
  const unknown = validateDiveFields({ media: [{ ...media, photoMetadata: { capturedLocal: photoMetadata.capturedLocal } }] }).media[0].photoMetadata;
  assert.equal(unknown.capturedAt, null);
  for (const invalid of [{ gps: { lat: 91, lng: 0 } }, { capturedLocal: '2026-02-30T00:00:00' }, { utcOffset: '+14:01' }, { orientation: 9 }]) assert.throws(() => validateDiveFields({ media: [{ ...media, photoMetadata: invalid }] }));
});

test('legacy imports retain bounded profile and heart-rate facts without claiming verification', () => {
  const doc = createDiveDocument({
    id: 'legacy-1', sourceType: 'legacy_import', diveDate: '2026-09-06', media: [], tags: [],
    heartRate: { avg: 72, max: 108 }, diveProfileGraph: [{ t: 0, depth: 0 }, { t: 60, depth: 12 }],
  }, 'owner');
  assert.equal(doc.fieldSources.heartRate, 'IMPORT');
  assert.equal(doc.fieldSources.diveProfileGraph, 'IMPORT');
  assert.deepEqual(doc.heartRate, { avg: 72, max: 108 });
  assert.throws(() => createDiveDocument({ id: 'bad', sourceType: 'legacy_import', diveDate: '', media: [], tags: [], diveProfileGraph: [{ t: -1, depth: 1 }] }, 'owner'));
});

test('advanced editor fields survive validation with server-derived provenance', () => {
  const weather = { pointId: 'reef', lat: 33.1, lng: 126.2, source: 'stormglass', riskLevel: 'good' };
  const media = [{ id: 'photo', type: 'image', url: 'https://example.com/photo.jpg', aiAnalysis: {
    marineLifeCandidates: ['Turtle'], environmentCandidates: ['Reef'], confidence: 'high', notes: 'review', source: 'AI_SUGGESTION', confirmed: true, cached: true,
  } }];
  const doc = createDiveDocument({ ...input, sourceType: 'manual', visibilityType: 'followers', weather, media, aiSummary: 'Summary' }, 'owner');
  assert.equal(doc.visibilityType, 'followers');
  assert.equal(doc.isPublic, false);
  assert.equal(doc.fieldSources.weather, 'WEATHER_API');
  assert.equal(doc.fieldSources.media, 'AI_IMAGE_ANALYSIS');
  assert.equal(doc.fieldSources.aiSummary, 'DERIVED');
  assert.deepEqual(doc.media[0].aiAnalysis.marineLifeCandidates, ['Turtle']);
});
