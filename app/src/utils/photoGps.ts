function scalar(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const text = raw.trim();
  if (!/^[+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+(?:\.\d+)?)?$/.test(text)) return null;
  const [n, d] = text.split('/').map(Number);
  const value = d === undefined ? n : n / d;
  return Number.isFinite(value) ? value : null;
}

function coordinate(raw: unknown, ref: unknown, positive: string, negative: string, limit: number): number | null {
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' && /[,\s]/.test(raw.trim()) ? raw.trim().split(/[,\s]+/) : [raw];
  if (parts.length !== 1 && parts.length !== 3) return null;
  const values = parts.map(scalar);
  if (values.some(v => v === null)) return null;
  const [d, m = 0, s = 0] = values as number[];
  if (m < 0 || m >= 60 || s < 0 || s >= 60) return null;
  let value = (d < 0 ? -1 : 1) * (Math.abs(d) + m / 60 + s / 3600);
  if (ref !== undefined && ref !== null && ref !== '') {
    if (typeof ref !== 'string' || ![positive, negative].includes(ref.toUpperCase())) return null;
    value = (ref.toUpperCase() === negative ? -1 : 1) * Math.abs(value);
  }
  return Math.abs(value) <= limit ? value : null;
}

export function parseExifGps(exif: Record<string, unknown> | null | undefined): { lat: number; lng: number } | null {
  if (!exif) return null;
  const lat = coordinate(exif.GPSLatitude, exif.GPSLatitudeRef, 'N', 'S', 90);
  const lng = coordinate(exif.GPSLongitude, exif.GPSLongitudeRef, 'E', 'W', 180);
  return lat === null || lng === null ? null : { lat, lng };
}

export interface PhotoMetadata {
  source: 'PHOTO_EXIF';
  gps: { lat: number; lng: number } | null;
  capturedLocal: string | null;
  utcOffset: string | null;
  capturedAt: string | null;
  cameraMake: string | null;
  cameraModel: string | null;
  orientation: number | null;
}

export function readPhotoMetadata(exif: Record<string, unknown> | null | undefined): PhotoMetadata {
  const data = exif || {};
  const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 200) : null;
  const rawDate = text(data.DateTimeOriginal);
  const match = rawDate?.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  const candidate = match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}` : null;
  const stamp = candidate ? Date.parse(`${candidate}Z`) : NaN;
  const capturedLocal = candidate && Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 19) === candidate ? candidate : null;
  const offset = text(data.OffsetTimeOriginal);
  const validOffset = offset?.match(/^([+-])(\d{2}):(\d{2})$/);
  const utcOffset = validOffset && Number(validOffset[2]) <= 14 && Number(validOffset[3]) < 60 && (Number(validOffset[2]) < 14 || validOffset[3] === '00') ? offset : null;
  const orientation = scalar(data.Orientation);
  return {
    source: 'PHOTO_EXIF',
    gps: parseExifGps(data),
    capturedLocal,
    utcOffset,
    // A camera wall clock is not an instant until its original offset is known.
    capturedAt: capturedLocal && utcOffset ? new Date(`${capturedLocal}${utcOffset}`).toISOString() : null,
    cameraMake: text(data.Make),
    cameraModel: text(data.Model),
    orientation: orientation !== null && Number.isInteger(orientation) && orientation >= 1 && orientation <= 8 ? orientation : null,
  };
}

export function uniquePhotoLocations(items: { gps: { lat: number; lng: number } | null }[]) {
  return [...new Map(items.flatMap(item => item.gps ? [[`${item.gps.lat},${item.gps.lng}`, item.gps] as const] : [])).values()];
}
