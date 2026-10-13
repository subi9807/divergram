CREATE TABLE IF NOT EXISTS app_education_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('scuba', 'freediving')),
  course_id TEXT NOT NULL,
  course_level TEXT NOT NULL DEFAULT '',
  course_title TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  preferred_region TEXT NOT NULL DEFAULT '',
  preferred_schedule TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'consulting', 'assigned', 'in_progress', 'completed', 'cancelled')),
  assigned_resort_id TEXT,
  assigned_instructor_user_id TEXT,
  assigned_admin_user_id TEXT,
  admin_note TEXT NOT NULL DEFAULT '',
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_education_applications_user_idx
  ON app_education_applications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_education_applications_status_idx
  ON app_education_applications(status, created_at DESC);

CREATE TABLE IF NOT EXISTS app_education_application_history (
  id BIGSERIAL PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES app_education_applications(id) ON DELETE CASCADE,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_education_application_history_application_idx
  ON app_education_application_history(application_id, created_at DESC);
