import type { DiveLog, MediaFile } from '../models';

export type DiveCopilotSuggestionKind = 'photo_tags' | 'photo_match' | 'environment';

export interface DiveCopilotSuggestion {
  id: string;
  kind: DiveCopilotSuggestionKind;
  mediaId?: string;
  evidenceRefs: string[];
  candidateCount?: number;
  distanceMinutes?: number;
}

export interface OneTapReadinessItem {
  id: 'base' | 'computer' | 'photos' | 'environment' | 'memo' | 'story';
  status: 'ready' | 'optional' | 'action';
}

type EditableDive = Pick<
  DiveLog,
  'sourceType' | 'diveDate' | 'entryTime' | 'entryLocation' | 'gpsLocation' | 'maxDepth' | 'totalDiveTime' | 'weather' | 'memo' | 'aiSummary'
> & { media: MediaFile[] };

function canLoadCurrentEnvironment(log: EditableDive, now: Date) {
  if (!log.entryLocation && !log.gpsLocation) return false;
  if (!log.diveDate || !log.entryTime) return false;
  const time = Date.parse(`${log.diveDate}T${log.entryTime}:00`);
  return Number.isFinite(time) && Math.abs(now.getTime() - time) <= 6 * 60 * 60 * 1000;
}

export function buildDiveCopilotSuggestions(log: EditableDive, currentLogId: string, now = new Date()): DiveCopilotSuggestion[] {
  const suggestions: DiveCopilotSuggestion[] = [];
  for (const media of log.media) {
    const analysis = media.aiAnalysis;
    const candidateCount = (analysis?.marineLifeCandidates.length || 0) + (analysis?.environmentCandidates.length || 0);
    if (analysis && !analysis.confirmed && candidateCount > 0) {
      suggestions.push({
        id: `photo-tags:${media.id}`,
        kind: 'photo_tags',
        mediaId: media.id,
        candidateCount,
        evidenceRefs: [`media:${media.id}`, 'ai-analysis:user-unconfirmed'],
      });
    }

    const match = media.diveMatch;
    if (match && !match.confirmed && !match.rejected && match.suggestedLogId === currentLogId && (match.status === 'inside' || match.status === 'near')) {
      suggestions.push({
        id: `photo-match:${media.id}:${currentLogId}`,
        kind: 'photo_match',
        mediaId: media.id,
        distanceMinutes: match.distanceMinutes,
        evidenceRefs: [`media:${media.id}`, `dive:${currentLogId}`, match.evidence],
      });
    }
  }

  if (!log.weather && canLoadCurrentEnvironment(log, now)) {
    suggestions.push({
      id: `environment:${currentLogId}:${log.diveDate}`,
      kind: 'environment',
      evidenceRefs: [`dive:${currentLogId}`, `date:${log.diveDate}`],
    });
  }
  return suggestions;
}

export function buildOneTapReadiness(log: EditableDive): OneTapReadinessItem[] {
  const hasBase = Boolean(log.diveDate && (Number.isFinite(log.maxDepth) || Number.isFinite(log.totalDiveTime)));
  const hasComputerData = log.sourceType !== 'manual';
  const hasPhotos = log.media.some(media => media.type === 'image');
  return [
    { id: 'base', status: hasBase ? 'ready' : 'action' },
    { id: 'computer', status: hasComputerData ? 'ready' : 'optional' },
    { id: 'photos', status: hasPhotos ? 'ready' : 'optional' },
    { id: 'environment', status: log.weather ? 'ready' : 'optional' },
    { id: 'memo', status: log.memo?.trim() ? 'ready' : 'optional' },
    { id: 'story', status: log.aiSummary?.trim() ? 'ready' : 'optional' },
  ];
}
