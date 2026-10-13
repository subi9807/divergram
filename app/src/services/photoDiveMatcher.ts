import type { DiveLog, MediaFile } from '../models';

export type PhotoDiveMatchStatus = 'inside' | 'near' | 'ambiguous' | 'unknown' | 'outside';

export interface PhotoDiveMatch {
  status: PhotoDiveMatchStatus;
  candidateLogIds: string[];
  suggestedLogId?: string;
  distanceMinutes?: number;
  evidence: 'CAPTURE_LOCAL_AND_DIVE_INTERVAL' | 'INSUFFICIENT_TIME_EVIDENCE';
}

function wallClock(value: string) {
  const parsed = Date.parse(`${value}Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function diveInterval(log: DiveLog): { start: number; end: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(log.diveDate || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(log.entryTime || '')) return null;
  const start = wallClock(`${log.diveDate}T${log.entryTime}:00`);
  if (start === null) return null;
  let end: number | null = null;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(log.exitTime || '')) {
    end = wallClock(`${log.diveDate}T${log.exitTime}:00`);
    if (end !== null && end < start) end += 24 * 60 * 60 * 1000;
  } else if (typeof log.totalDiveTime === 'number' && Number.isFinite(log.totalDiveTime) && log.totalDiveTime >= 0 && log.totalDiveTime <= 1440) {
    end = start + log.totalDiveTime * 60 * 1000;
  }
  return end === null ? null : { start, end };
}

export function matchPhotoToDives(media: MediaFile, logs: DiveLog[], nearMinutes = 120): PhotoDiveMatch {
  const capturedLocal = media.photoMetadata?.capturedLocal;
  const captured = capturedLocal ? wallClock(capturedLocal) : null;
  if (captured === null) return { status: 'unknown', candidateLogIds: [], evidence: 'INSUFFICIENT_TIME_EVIDENCE' };

  const candidates = logs.flatMap(log => {
    const interval = diveInterval(log);
    if (!interval) return [];
    const inside = captured >= interval.start && captured <= interval.end;
    const distanceMs = inside ? 0 : Math.min(Math.abs(captured - interval.start), Math.abs(captured - interval.end));
    return [{ log, inside, distanceMinutes: Math.round(distanceMs / 60000) }];
  }).filter(row => row.inside || row.distanceMinutes <= nearMinutes)
    .sort((a, b) => Number(b.inside) - Number(a.inside) || a.distanceMinutes - b.distanceMinutes || a.log.id.localeCompare(b.log.id));

  if (!candidates.length) return { status: 'outside', candidateLogIds: [], evidence: 'CAPTURE_LOCAL_AND_DIVE_INTERVAL' };
  const best = candidates[0];
  const tied = candidates.filter(row => row.inside === best.inside && row.distanceMinutes === best.distanceMinutes);
  if (tied.length > 1 || candidates.filter(row => row.inside).length > 1) {
    return { status: 'ambiguous', candidateLogIds: candidates.map(row => row.log.id), distanceMinutes: best.distanceMinutes, evidence: 'CAPTURE_LOCAL_AND_DIVE_INTERVAL' };
  }
  return { status: best.inside ? 'inside' : 'near', candidateLogIds: candidates.map(row => row.log.id), suggestedLogId: best.log.id, distanceMinutes: best.distanceMinutes, evidence: 'CAPTURE_LOCAL_AND_DIVE_INTERVAL' };
}

export function withPhotoMatch(media: MediaFile, logs: DiveLog[]): MediaFile {
  return { ...media, diveMatch: { ...matchPhotoToDives(media, logs), confirmed: false } };
}
