export type ModerationStatus = 'warning' | 'temporary_limit' | 'upload_limit' | 'suspended' | 'permanent_ban';

export interface ModerationAction {
  id: string;
  reportId?: string;
  targetUserId: string;
  status: ModerationStatus;
  reason: string;
  startedAt: string;
  endsAt?: string;
  createdAt: string;
}
