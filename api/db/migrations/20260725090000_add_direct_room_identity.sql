ALTER TABLE app_rooms
  ADD COLUMN IF NOT EXISTS direct_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS app_rooms_direct_key_idx
  ON app_rooms(direct_key)
  WHERE direct_key IS NOT NULL;

DELETE FROM app_participants duplicate
USING app_participants keep
WHERE duplicate.room_id=keep.room_id
  AND duplicate.user_id=keep.user_id
  AND duplicate.id > keep.id;

CREATE UNIQUE INDEX IF NOT EXISTS app_participants_room_user_idx
  ON app_participants(room_id, user_id);
