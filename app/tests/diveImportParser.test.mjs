import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDiveCsv } from '../src/services/diveImportParsing.ts';
import { assessDiveImportDuplicates, previewDiveImport } from '../src/services/diveImportParser.ts';

test('CSV parser preserves commas and escaped quotes in quoted source fields', () => {
  const rows = parseDiveCsv('id,date,memo\n1,2026-09-06,"Turtle, \"\"large\"\""');
  assert.equal(rows[1][2], 'Turtle, "large"');
});

test('CSV parser handles BOM, CRLF and multiline quoted values', () => {
  const rows = parseDiveCsv('\uFEFFid,memo\r\n1,"line one\nline two"\r\n');
  assert.deepEqual(rows, [['id', 'memo'], ['1', 'line one\nline two']]);
});

test('UDDF import extracts dive measurements and profile samples without guessing units', () => {
  const source = `<?xml version="1.0"?><uddf version="3.2.2"><profiledata><repetitiongroup><dive id="dive-7"><informationbeforedive><datetime>2026-08-31T09:14:00</datetime></informationbeforedive><greatestdepth>24.6</greatestdepth><divetime>3120</divetime><lowesttemperature>21.4</lowesttemperature><samples><waypoint><divetime>0</divetime><depth>0</depth></waypoint><waypoint><divetime>60</divetime><depth>8.2</depth></waypoint></samples></dive></repetitiongroup></profiledata></uddf>`;
  const [row] = previewDiveImport(source, 'uddf');
  assert.equal(row.status, 'ready');
  assert.equal(row.normalized?.externalLogId, 'dive-7');
  assert.equal(row.normalized?.diveDate, '2026-08-31');
  assert.equal(row.normalized?.entryTime, '09:14');
  assert.equal(row.normalized?.totalDiveTimeMin, 52);
  assert.equal(row.normalized?.maxDepthM, 24.6);
  assert.deepEqual(row.normalized?.diveProfileGraph, [{ t: 0, depth: 0 }, { t: 60, depth: 8.2 }]);
});

test('UDDF import rejects DTD and external entity declarations', () => {
  const [row] = previewDiveImport('<!DOCTYPE uddf [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><uddf><dive id="1"><notes>&xxe;</notes></dive></uddf>', 'uddf');
  assert.equal(row.status, 'error');
  assert.equal(row.error, 'invalid_file');
});

test('import preview separates exact retries from possible duplicate dives', () => {
  const rows = previewDiveImport('[{"id":"same","date":"2026-08-31","maxDepth":20,"duration":40,"durationUnit":"min"},{"id":"near","date":"2026-08-31","maxDepth":20.3,"duration":41,"durationUnit":"min"},{"id":"new","date":"2026-09-01","maxDepth":10,"duration":20,"durationUnit":"min"}]', 'json');
  const result = assessDiveImportDuplicates(rows, [{ sourceType: 'legacy_import', externalLogId: 'same', diveDate: '2026-08-31', maxDepth: 20, totalDiveTime: 40 }]);
  assert.deepEqual(result.map((row) => row.status), ['duplicate', 'possible_duplicate', 'ready']);
});
