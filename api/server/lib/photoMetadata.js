export function normalizePhotoMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_photo_metadata');
  const text = key => {
    if (value[key] == null) return null;
    if (typeof value[key] !== 'string' || value[key].length > 200) throw new Error('invalid_photo_metadata');
    return value[key].trim() || null;
  };
  const capturedLocal = text('capturedLocal');
  if (capturedLocal && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(capturedLocal) || !Number.isFinite(Date.parse(`${capturedLocal}Z`)) || new Date(`${capturedLocal}Z`).toISOString().slice(0, 19) !== capturedLocal)) throw new Error('invalid_photo_metadata');
  const utcOffset = text('utcOffset');
  if (utcOffset && !/^[+-](?:0\d|1[0-3]):[0-5]\d$|^[+-]14:00$/.test(utcOffset)) throw new Error('invalid_photo_metadata');
  let gps = null;
  if (value.gps != null) {
    const { lat, lng } = value.gps;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('invalid_photo_metadata');
    gps = { lat, lng };
  }
  const orientation = value.orientation ?? null;
  if (orientation !== null && (!Number.isInteger(orientation) || orientation < 1 || orientation > 8)) throw new Error('invalid_photo_metadata');
  // These are unverified client EXIF claims, never device-verified measurements.
  return { source: 'PHOTO_EXIF', gps, capturedLocal, utcOffset,
    capturedAt: capturedLocal && utcOffset ? new Date(`${capturedLocal}${utcOffset}`).toISOString() : null,
    cameraMake: text('cameraMake'), cameraModel: text('cameraModel'), orientation };
}
