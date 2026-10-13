const ALLOWED_CONFIDENCE = new Set(['low', 'medium', 'high']);
const ALLOWED_CATEGORIES = new Set(['fish', 'coral', 'marine_mammal', 'reptile', 'mollusk', 'crustacean', 'echinoderm', 'cnidarian', 'sponge', 'algae', 'other']);

function cleanList(value, max = 12) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => String(item || '').trim().slice(0, 80)).filter(Boolean))].slice(0, max);
}

function cleanCandidateDetails(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map(item => ({
    name: String(item?.name || '').trim().slice(0, 120),
    category: ALLOWED_CATEGORIES.has(String(item?.category || '').trim()) ? String(item.category).trim() : 'other',
    scientificName: String(item?.scientificName || '').trim().slice(0, 160),
    summary: String(item?.summary || '').trim().slice(0, 320),
    habitat: String(item?.habitat || '').trim().slice(0, 220),
    identificationTips: cleanList(item?.identificationTips, 4),
  })).filter(item => item.name);
}

export function normalizeDivePhotoAnalysis(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_photo_analysis');
  return {
    marineLifeCandidates: cleanList(value.marineLifeCandidates),
    candidateDetails: cleanCandidateDetails(value.candidateDetails),
    environmentCandidates: cleanList(value.environmentCandidates),
    confidence: ALLOWED_CONFIDENCE.has(value.confidence) ? value.confidence : 'low',
    notes: String(value.notes || '').trim().slice(0, 500),
    source: 'AI_SUGGESTION',
    confirmed: false,
  };
}

export function parseDivePhotoAnalysisText(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return normalizeDivePhotoAnalysis(JSON.parse(raw));
}
