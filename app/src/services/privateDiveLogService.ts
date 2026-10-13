import api from '../lib/api';
import type { DiveLog } from '../models';

export type PrivateDiveLog = DiveLog & { revision: number; fieldSources: NonNullable<DiveLog['fieldSources']> };

export interface DiveLogSource {
  original_data: Record<string, unknown>;
  source_kind: 'USER' | 'UNVERIFIED_IMPORT';
}

function document(value: unknown): PrivateDiveLog {
  const row = value as PrivateDiveLog;
  if (!row || typeof row.id !== 'string' || typeof row.userId !== 'string' || !Number.isInteger(row.revision) || row.revision < 1 || !row.fieldSources || !Array.isArray(row.media) || !Array.isArray(row.tags)) {
    throw new Error('invalid_private_dive_log_response');
  }
  return row;
}

// Separate from app_posts: these owner-only documents never publish a feed.
export const privateDiveLogService = {
  async list(after?: string): Promise<{ data: PrivateDiveLog[]; nextCursor: string | null }> {
    const body = (await api.get('/dive-logs', { params: { after, limit: 30 } })).data;
    if (!Array.isArray(body?.data) || (body.nextCursor !== null && typeof body.nextCursor !== 'string')) throw new Error('invalid_private_dive_log_response');
    return { data: body.data.map(document), nextCursor: body.nextCursor };
  },
  async listAll(): Promise<PrivateDiveLog[]> {
    const rows: PrivateDiveLog[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.list(cursor);
      rows.push(...page.data);
      cursor = page.nextCursor || undefined;
    } while (cursor);
    return rows;
  },
  async get(id: string): Promise<PrivateDiveLog> {
    return document((await api.get(`/dive-logs/${encodeURIComponent(id)}`)).data.data);
  },
  async create(data: Record<string, unknown>): Promise<PrivateDiveLog> {
    return document((await api.post('/dive-logs', { data })).data.data);
  },
  async createMany(items: Record<string, unknown>[]): Promise<PrivateDiveLog[]> {
    const saved: PrivateDiveLog[] = [];
    for (const item of items) saved.push(await this.create(item));
    return saved;
  },
  async patch(log: Pick<PrivateDiveLog, 'id' | 'revision'>, patch: Record<string, unknown>): Promise<PrivateDiveLog> {
    return document((await api.patch(`/dive-logs/${encodeURIComponent(log.id)}`, { baseRevision: log.revision, patch })).data.data);
  },
  async source(id: string): Promise<DiveLogSource> {
    const body = (await api.get(`/dive-logs/${encodeURIComponent(id)}/source`)).data.data;
    if (!body?.original_data || !['USER', 'UNVERIFIED_IMPORT'].includes(body.source_kind)) throw new Error('invalid_private_dive_log_response');
    return body;
  },
};
