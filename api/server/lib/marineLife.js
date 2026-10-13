const CONFIDENCE = new Set(['low', 'medium', 'high']);
const MEDIA_TYPES = new Set(['image', 'video']);
const SPECIES_CATEGORIES = new Set(['fish', 'coral', 'marine_mammal', 'reptile', 'mollusk', 'crustacean', 'echinoderm', 'cnidarian', 'sponge', 'algae', 'other']);

export function normalizeSpeciesName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function speciesKey(value) {
  return normalizeSpeciesName(value).toLocaleLowerCase('en-US');
}

function validCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function normalizeMarineLifeSighting(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_marine_life_sighting');
  const speciesName = normalizeSpeciesName(input.speciesName);
  const imageUrl = String(input.imageUrl || '').trim().slice(0, 2000);
  const mediaType = MEDIA_TYPES.has(String(input.mediaType || '').trim()) ? String(input.mediaType).trim() : 'image';
  const mediaUrl = String(input.mediaUrl || imageUrl).trim().slice(0, 2000);
  const category = SPECIES_CATEGORIES.has(String(input.category || '').trim()) ? String(input.category).trim() : 'other';
  const observedAt = String(input.observedAt || '').trim();
  const locationName = String(input.locationName || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  const notes = String(input.notes || '').trim().slice(0, 1000);
  const visibilityType = normalizeItemVisibilityValue(input.visibilityType);
  if (!speciesName) throw new Error('species_name_required');
  if (!/^https:\/\/[^\s]+$/i.test(imageUrl)) throw new Error('marine_life_image_required');
  if (!/^https:\/\/[^\s]+$/i.test(mediaUrl)) throw new Error('marine_life_media_required');
  if (observedAt && !validCalendarDate(observedAt)) throw new Error('invalid_observed_at');
  return { speciesName, normalizedSpeciesName: speciesKey(speciesName), imageUrl, mediaType, mediaUrl, category, observedAt: observedAt || null, locationName, notes, visibilityType };
}

function normalizeItemVisibilityValue(value) {
  const normalized = String(value || 'inherit').trim().toLowerCase();
  return ['inherit', 'public', 'followers', 'private'].includes(normalized) ? normalized : 'inherit';
}

export function confirmedAnalysisForSpecies(analysis, speciesName) {
  const candidates = Array.isArray(analysis?.marineLifeCandidates)
    ? analysis.marineLifeCandidates.map(normalizeSpeciesName).filter(Boolean).slice(0, 12)
    : [];
  const selectedKey = speciesKey(speciesName);
  if (!candidates.some(candidate => speciesKey(candidate) === selectedKey)) return null;
  const details = Array.isArray(analysis?.candidateDetails)
    ? analysis.candidateDetails.find(item => speciesKey(item?.name) === selectedKey) || null
    : null;
  return {
    candidates,
    confidence: CONFIDENCE.has(analysis?.confidence) ? analysis.confidence : 'low',
    details,
  };
}

export function marineLifeSightingResponse(row) {
  return {
    id: String(row.id),
    speciesName: String(row.species_name || ''),
    imageUrl: String(row.image_url || ''),
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    mediaUrl: String(row.media_url || row.image_url || ''),
    category: SPECIES_CATEGORIES.has(row.species_category) ? row.species_category : 'other',
    observedAt: row.observed_at ? String(row.observed_at).slice(0, 10) : null,
    locationName: String(row.location_name || ''),
    notes: String(row.notes || ''),
    source: row.source === 'AI_CONFIRMED' ? 'AI_CONFIRMED' : 'USER',
    aiConfidence: row.ai_confidence || null,
    aiCandidates: Array.isArray(row.ai_candidates) ? row.ai_candidates : [],
    scientificName: String(row.species_scientific_name || ''),
    summary: String(row.species_summary || ''),
    habitat: String(row.species_habitat || ''),
    identificationTips: Array.isArray(row.species_identification_tips) ? row.species_identification_tips : [],
    visibilityType: normalizeItemVisibilityValue(row.visibility_type),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}
