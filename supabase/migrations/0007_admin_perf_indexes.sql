-- Admin portal performance: indexing gap-fill + idempotency hardening.
--
-- Scope: this migration ONLY adds indexes that the admin list/search queries need
-- (Req 6.1, 6.2) and that are NOT already provided by 0004_admin_performance.sql.
-- It changes no data, so identical filter/sort/search inputs return the same rows
-- in the same order before and after application (Req 6.4).
--
-- Already provided by 0004_admin_performance.sql (DO NOT recreate here):
--   * Extension: pg_trgm
--   * Req 6.1 filter/sort composites:
--       idx_profiles_approval_created  ON profiles (approval_status, created_at DESC)
--       idx_profiles_approval_active   ON profiles (approval_status, is_active)
--       idx_profiles_approval_batch    ON profiles (approval_status, batch_year)
--       idx_profiles_approval_state    ON profiles (approval_status, current_state)
--       idx_profiles_last_seen         ON profiles (last_seen_at DESC)
--       idx_payments_status_created    ON payments (status, created_at DESC)
--       idx_payments_plan_created      ON payments (plan_id, created_at DESC)
--       idx_announcements_status_schedule, idx_events_published_starts,
--       idx_forum_threads_recent, idx_forum_threads_popular
--   * Req 6.2 trigram (GIN) search indexes:
--       idx_profiles_full_name_trgm ON profiles USING GIN (full_name gin_trgm_ops)
--       idx_profiles_email_trgm     ON profiles USING GIN (email     gin_trgm_ops)
--       idx_profiles_company_trgm, idx_profiles_city_trgm
--       idx_payments_txnid_trgm     ON payments USING GIN (txnid     gin_trgm_ops)
--
-- Therefore the full_name/email/txnid substring search (Req 6.2) and the
-- approval_status/status + created_at filter/sort paths (Req 6.1) are ALREADY
-- covered. This file only fills the remaining gaps below.
--
-- Idempotency (Req 6.6): every statement uses IF NOT EXISTS, so re-applying this
-- migration is a no-op and never creates a duplicate index or errors.

-- Defensive, idempotent guard. pg_trgm is already created by 0004; this only makes
-- the migration self-sufficient if it is ever applied in isolation. No-op otherwise.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Gap 1 (Req 6.1): the alumni list filters on is_paid_member ("paid"/"free") and
-- orders by created_at DESC. 0004 has no index leading with is_paid_member, so this
-- composite supports both the membership filter and the ordering in one index scan.
CREATE INDEX IF NOT EXISTS idx_profiles_paid_created
  ON profiles (is_paid_member, created_at DESC);

-- Gap 2 (Req 6.1): unfiltered lists ordered by created_at DESC (the dashboard
-- "recent signups" limit, and the default/unfiltered alumni list) cannot use any
-- 0004 composite because every profiles composite leads with approval_status, and
-- idx_profiles_last_seen is on last_seen_at. A standalone created_at index lets an
-- unfiltered ORDER BY created_at DESC use an index scan instead of a seq scan + sort.
-- (If EXPLAIN at representative volume later shows this is redundant, it can be
--  dropped without affecting correctness.)
CREATE INDEX IF NOT EXISTS idx_profiles_created_at
  ON profiles (created_at DESC);
