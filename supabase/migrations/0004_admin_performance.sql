-- Performance indexes for admin dashboards, filters, and 10k+ alumni datasets.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_approval_created
  ON profiles (approval_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_approval_active
  ON profiles (approval_status, is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_approval_batch
  ON profiles (approval_status, batch_year);

CREATE INDEX IF NOT EXISTS idx_profiles_approval_state
  ON profiles (approval_status, current_state);

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen
  ON profiles (last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm
  ON profiles USING GIN (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
  ON profiles USING GIN (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_company_trgm
  ON profiles USING GIN (company gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_city_trgm
  ON profiles USING GIN (current_city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_payments_status_created
  ON payments (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_plan_created
  ON payments (plan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_txnid_trgm
  ON payments USING GIN (txnid gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_announcements_status_schedule
  ON announcements (is_published, scheduled_for, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_published_starts
  ON events (is_published, starts_at);

CREATE INDEX IF NOT EXISTS idx_forum_threads_recent
  ON forum_threads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_threads_popular
  ON forum_threads (reply_count DESC, created_at DESC);
