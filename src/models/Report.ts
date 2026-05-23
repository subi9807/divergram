export type ReportTargetType = 'user' | 'post' | 'comment' | 'dive_log' | 'media';
export type ReportReason =
  | 'sexual_content'
  | 'violence'
  | 'hate'
  | 'misinformation'
  | 'dangerous_behavior'
  | 'copyright'
  | 'impersonation'
  | 'spam';

export type ReportStatus = 'received' | 'reviewing' | 'resolved' | 'rejected';

export interface Report {
  id: string;
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  detail?: string;
  status: ReportStatus;
  reviewedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}
