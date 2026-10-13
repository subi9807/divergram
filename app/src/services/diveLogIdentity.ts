function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function canonicalImportedDiveLogId(sourceType: string, externalLogId: string) {
  const raw = `${sourceType}-${externalLogId}`;
  if (/^[a-zA-Z0-9._:-]{1,160}$/.test(raw)) return raw;
  const safeSource = sourceType.replace(/[^a-zA-Z0-9._:-]+/g, '_').slice(0, 40) || 'import';
  const safeExternal = externalLogId.replace(/[^a-zA-Z0-9._:-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100) || 'log';
  return `${safeSource}-${safeExternal}-${fnv1a(raw)}`.slice(0, 160);
}
