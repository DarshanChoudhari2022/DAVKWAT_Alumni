-- Performance optimization: composite index for the alumni detail page payments query.
-- The page queries payments WHERE alumni_id = ? ORDER BY created_at DESC, and the
-- existing idx_payments_status_created (status, created_at DESC) doesn't help because
-- the leading column is status, not alumni_id.
--
-- Idempotent: uses IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS idx_payments_alumni_created
  ON payments (alumni_id, created_at DESC);
