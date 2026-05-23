export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'marine_weather_alert'
  | 'dive_schedule'
  | 'sync_complete'
  | 'sync_failed'
  | 'bluetooth_error'
  | 'certification_status';

export interface NotificationSetting {
  userId: string;
  pushEnabled: boolean;
  items: Record<NotificationType, boolean>;
  updatedAt: string;
}
