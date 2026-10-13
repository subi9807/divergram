import { isDeepStrictEqual } from 'node:util';
import { normalizePhotoMetadata } from './photoMetadata.js';
const SOURCES = new Set(['manual', 'garmin_api', 'suunto_api', 'shearwater_api', 'bluetooth', 'legacy_import']);
const FIELD_SOURCES = new Set(['DIVE_COMPUTER', 'USER', 'PHOTO_EXIF', 'AI_IMAGE_ANALYSIS', 'WEATHER_API', 'MARINE_API', 'IMPORT', 'DERIVED']);
const NUMBERS = { totalDiveTime: [0, 1440], maxDepth: [0, 500], avgDepth: [0, 500], waterTemperature: [-5, 60], visibility: [0, 200], currentStrength: [0, 30] };
const TEXT = ['diveDate', 'entryTime', 'exitTime', 'divePointId', 'divePointName', 'equipmentInfo', 'buddyName', 'memo', 'certificationLevel'];
const AI_TEXT = ['aiSummary', 'aiCaption'];
export const EDITABLE_FIELDS = [...TEXT, ...AI_TEXT, ...Object.keys(NUMBERS), 'entryLocation', 'exitLocation', 'tags', 'media', 'weather', 'visibilityType', 'copilotIgnoredSuggestionIds'];

function boundedJson(value, code, maxBytes = 100_000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded) > maxBytes) throw new Error(code);
  return JSON.parse(encoded);
}

function normalizeAiAnalysis(value) {
  if (value === undefined) return undefined;
  const item = boundedJson(value, 'invalid_dive_media_analysis', 20_000);
  const list = key => {
    if (!Array.isArray(item[key]) || item[key].length > 50 || item[key].some(entry => typeof entry !== 'string' || entry.length > 160)) throw new Error('invalid_dive_media_analysis');
    return [...new Set(item[key])];
  };
  if (!['low', 'medium', 'high'].includes(item.confidence) || item.source !== 'AI_SUGGESTION' || typeof item.confirmed !== 'boolean') throw new Error('invalid_dive_media_analysis');
  if (typeof item.notes !== 'string' || item.notes.length > 2_000) throw new Error('invalid_dive_media_analysis');
  return { marineLifeCandidates: list('marineLifeCandidates'), environmentCandidates: list('environmentCandidates'), confidence: item.confidence, notes: item.notes, source: 'AI_SUGGESTION', confirmed: item.confirmed, ...(typeof item.cached === 'boolean' ? { cached: item.cached } : {}) };
}

function sourceForField(sourceType, key, value) {
  if (key === 'weather') return value?.source === 'none' ? 'USER' : 'WEATHER_API';
  if (key === 'aiSummary' || key === 'aiCaption') return 'DERIVED';
  if (key === 'media' && Array.isArray(value)) {
    if (value.some(item => item?.aiAnalysis)) return 'AI_IMAGE_ANALYSIS';
    if (value.some(item => item?.photoMetadata)) return 'PHOTO_EXIF';
  }
  if (sourceType === 'manual') return 'USER';
  if (sourceType === 'legacy_import') return 'IMPORT';
  return 'DIVE_COMPUTER';
}

function normalizeHeartRate(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_dive_heart_rate');
  const result = {};
  for (const key of ['avg', 'max']) {
    if (value[key] === undefined || value[key] === null) continue;
    if (typeof value[key] !== 'number' || !Number.isFinite(value[key]) || value[key] < 0 || value[key] > 300) throw new Error('invalid_dive_heart_rate');
    result[key] = value[key];
  }
  return Object.keys(result).length ? result : undefined;
}

function normalizeDiveProfile(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 20_000) throw new Error('invalid_dive_profile');
  return value.map(point => {
    const t = point?.t;
    const depth = point?.depth;
    if (typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > 172_800 || typeof depth !== 'number' || !Number.isFinite(depth) || depth < 0 || depth > 500) throw new Error('invalid_dive_profile');
    return { t, depth };
  });
}

export function validDiveLogId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9._:-]{1,160}$/.test(id);
}
export function validateDiveFields(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Buffer.byteLength(JSON.stringify(input)) > 500_000) throw new Error('invalid_dive_log');
  const result = {};
  for (const key of TEXT) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || input[key].length > (key === 'memo' ? 10000 : 300)) throw new Error('invalid_dive_log');
    result[key] = input[key].trim();
  }
  for (const key of AI_TEXT) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'string' || input[key].length > 20_000) throw new Error('invalid_dive_log');
    result[key] = input[key].trim();
  }
  if (result.diveDate && (!/^\d{4}-\d{2}-\d{2}$/.test(result.diveDate) || !Number.isFinite(Date.parse(result.diveDate)) || new Date(result.diveDate).toISOString().slice(0, 10) !== result.diveDate)) throw new Error('invalid_dive_date');
  for (const key of ['entryTime', 'exitTime']) if (result[key] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(result[key])) throw new Error('invalid_dive_time');
  for (const [key, [min, max]] of Object.entries(NUMBERS)) {
    if (input[key] === undefined) continue;
    const value = input[key];
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)) throw new Error('invalid_dive_number');
    result[key] = value;
  }
  for (const key of ['entryLocation', 'exitLocation', 'gpsLocation']) {
    if (input[key] === undefined) continue;
    if (input[key] === null) { result[key] = null; continue; }
    const { lat, lng } = input[key] || {};
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('invalid_dive_location');
    result[key] = { lat, lng };
  }
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.length > 50 || input.tags.some(t => typeof t !== 'string' || t.length > 100)) throw new Error('invalid_dive_tags');
    result.tags = [...new Set(input.tags)];
  }
  if (input.media !== undefined) {
    if (!Array.isArray(input.media) || input.media.length > 30) throw new Error('invalid_dive_media');
    result.media = input.media.map(item => {
      if (!item || typeof item.id !== 'string' || item.id.length > 160 || !['image', 'video'].includes(item.type)) throw new Error('invalid_dive_media');
      let url;
      try { url = new URL(item.url); } catch { throw new Error('dive_media_not_uploaded'); }
      if (url.protocol !== 'https:') throw new Error('invalid_dive_media');
      const diveMatch = item.diveMatch === undefined ? undefined : boundedJson(item.diveMatch, 'invalid_dive_media_match', 20_000);
      const aiAnalysis = normalizeAiAnalysis(item.aiAnalysis);
      return { id: item.id, type: item.type, url: url.href, uploadStatus: 'uploaded',
        ...(typeof item.thumbnailUrl === 'string' && item.thumbnailUrl.length <= 2_000 ? { thumbnailUrl: item.thumbnailUrl } : {}),
        ...(typeof item.durationSec === 'number' && Number.isFinite(item.durationSec) && item.durationSec >= 0 ? { durationSec: item.durationSec } : {}),
        ...(item.photoMetadata !== undefined ? { photoMetadata: normalizePhotoMetadata(item.photoMetadata) } : {}),
        ...(diveMatch ? { diveMatch } : {}), ...(aiAnalysis ? { aiAnalysis } : {}) };
    });
  }
  if (input.weather !== undefined) result.weather = boundedJson(input.weather, 'invalid_dive_weather', 100_000);
  if (input.visibilityType !== undefined) {
    if (!['public', 'followers', 'private'].includes(input.visibilityType)) throw new Error('invalid_dive_visibility');
    result.visibilityType = input.visibilityType;
  }
  if (input.copilotIgnoredSuggestionIds !== undefined) {
    if (!Array.isArray(input.copilotIgnoredSuggestionIds) || input.copilotIgnoredSuggestionIds.length > 100 || input.copilotIgnoredSuggestionIds.some(value => typeof value !== 'string' || value.length > 160)) throw new Error('invalid_dive_copilot_state');
    result.copilotIgnoredSuggestionIds = [...new Set(input.copilotIgnoredSuggestionIds)];
  }
  const heartRate = normalizeHeartRate(input.heartRate);
  if (heartRate) result.heartRate = heartRate;
  const diveProfileGraph = normalizeDiveProfile(input.diveProfileGraph);
  if (diveProfileGraph) result.diveProfileGraph = diveProfileGraph;
  return result;
}

export function createDiveDocument(input, userId) {
  const data = validateDiveFields(input);
  if (!validDiveLogId(input.id) || !SOURCES.has(input.sourceType)) throw new Error('invalid_dive_log');
  const identity = {};
  for (const key of ['externalLogId', 'deviceId', 'deviceName']) {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'string' || input[key].length > 300) throw new Error('invalid_dive_identity');
      identity[key] = input[key];
    }
  }
  const visibilityType = data.visibilityType || 'private';
  return { ...data, ...identity, id: input.id, userId, sourceType: input.sourceType, diveDate: data.diveDate || '', media: data.media || [], tags: data.tags || [],
    visibilityType, isPublic: visibilityType === 'public', syncStatus: 'done', schemaVersion: 1,
    fieldSources: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, sourceForField(input.sourceType, key, value)]).filter(([, source]) => FIELD_SOURCES.has(source))) };
}

export function applyDivePatch(current, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).length === 0 || Object.keys(patch).some(key => !EDITABLE_FIELDS.includes(key))) throw new Error('immutable_dive_field');
  const fields = validateDiveFields(patch);
  const visibilityType = fields.visibilityType ?? current.visibilityType;
  return { ...current, ...fields, visibilityType, isPublic: visibilityType === 'public', fieldSources: { ...current.fieldSources, ...Object.fromEntries(Object.entries(fields).filter(([key, value]) => !isDeepStrictEqual(current[key], value)).map(([key, value]) => [key, sourceForField('manual', key, value)])) } };
}

export function diveResponse(row) {
  return { ...row.data, id: row.id, userId: row.user_id, revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at };
}
