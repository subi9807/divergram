const FISH_ANCESTOR_IDS = new Set([47178, 47273]);

export function normalizeSpeciesSearchQuery(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 80);
}

export function localizedCommonName(taxon, locale = 'en') {
  const requestedLocale = String(locale || 'en').toLowerCase();
  const languageCode = requestedLocale.split('-')[0];
  const names = Array.isArray(taxon?.names) ? taxon.names : [];
  const localized = names.find(name => {
    const nameLocale = String(name?.locale || '').toLowerCase();
    return name?.is_valid !== false && (nameLocale === requestedLocale || nameLocale.split('-')[0] === languageCode);
  });
  const english = names.find(name => name?.is_valid !== false && String(name?.locale || '').toLowerCase().split('-')[0] === 'en');
  return plainText(localized?.name || taxon?.preferred_common_name || english?.name || taxon?.english_common_name || taxon?.name);
}

export function isFishTaxon(taxon) {
  if (!taxon || typeof taxon !== 'object') return false;
  if (['Actinopterygii', 'Chondrichthyes'].includes(String(taxon.iconic_taxon_name || taxon.name || ''))) return true;
  return [taxon.id, ...(Array.isArray(taxon.ancestor_ids) ? taxon.ancestor_ids : [])]
    .some(id => FISH_ANCESTOR_IDS.has(Number(id)));
}

export function plainText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export function isReusableCommonsLicense(value) {
  const license = plainText(value);
  return /^(CC0|Public domain|CC BY(?:-SA)?(?:\s|$))/i.test(license);
}

export function marineSpeciesSearchResponse(taxon, photo = null, locale = 'en') {
  const scientificName = plainText(taxon?.name);
  return {
    id: String(taxon?.id || ''),
    commonName: localizedCommonName(taxon, locale),
    scientificName,
    rank: plainText(taxon?.rank),
    observationsCount: Math.max(0, Number(taxon?.observations_count || 0)),
    taxonomy: {
      class: plainText(taxon?.class),
      order: plainText(taxon?.order),
      family: plainText(taxon?.family),
      genus: plainText(taxon?.genus),
    },
    providerUrl: taxon?.id ? `https://www.inaturalist.org/taxa/${encodeURIComponent(String(taxon.id))}` : '',
    wikipediaUrl: /^https?:\/\//i.test(String(taxon?.wikipedia_url || '')) ? String(taxon.wikipedia_url).replace(/^http:/i, 'https:') : '',
    photo,
  };
}
