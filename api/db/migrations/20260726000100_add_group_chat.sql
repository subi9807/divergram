ALTER TABLE app_rooms
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS app_message_deliveries_message_user_idx
  ON app_message_deliveries(message_id, user_id);
