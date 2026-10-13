CREATE TABLE IF NOT EXISTS app_website_inquiries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('support', 'partnership')),
  locale TEXT NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko', 'en', 'ja', 'zh')),
  category TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '', message TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '', country_region TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
  privacy_consent BOOLEAN NOT NULL DEFAULT false, consented_at TIMESTAMPTZ, source_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'reviewing', 'replied', 'closed', 'spam')),
  assigned_admin_user_id TEXT, admin_note TEXT NOT NULL DEFAULT '', replied_at TIMESTAMPTZ, closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_website_inquiries_kind_status_idx ON app_website_inquiries(kind,status,created_at DESC);
CREATE INDEX IF NOT EXISTS app_website_inquiries_email_idx ON app_website_inquiries(lower(email),created_at DESC);
CREATE TABLE IF NOT EXISTS app_website_inquiry_history (
  id BIGSERIAL PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES app_website_inquiries(id) ON DELETE CASCADE,
  actor_user_id TEXT, action TEXT NOT NULL, from_status TEXT, to_status TEXT, note TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_website_inquiry_history_inquiry_idx ON app_website_inquiry_history(inquiry_id,created_at DESC);
