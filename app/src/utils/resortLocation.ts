const EMPTY_LOCATION_VALUES = new Set(['n/a', 'na', 'none', 'null', 'undefined', 'unknown', '-', '--']);

export function normalizeResortLocation(value: unknown): string {
  const cleaned = String(value ?? '')
    .trim()
    .replace(/\b(?:no|unknown)\s+(?:state|province|region|county|city)\b\s*/gi, '')
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,·-]+|[\s,·-]+$/g, '');
  return EMPTY_LOCATION_VALUES.has(cleaned.toLowerCase()) ? '' : cleaned;
}

export function removeRepeatedLocationPart(value: string, repeatedPart: string): string {
  const repeated = repeatedPart.trim().toLocaleLowerCase('en-US');
  if (!value || !repeated) return value;
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part.toLocaleLowerCase('en-US') !== repeated)
    .join(', ');
}

export function normalizeResortAddressFields(input: { country?: unknown; region?: unknown; address?: unknown }) {
  const country = normalizeResortLocation(input.country);
  const region = removeRepeatedLocationPart(normalizeResortLocation(input.region), country);
  const address = removeRepeatedLocationPart(normalizeResortLocation(input.address), country);
  return { country, region, address };
}
