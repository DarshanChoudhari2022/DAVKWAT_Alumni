-- ============================================================
-- DAVKAWT Admin Portal — PERFORMANCE TEST DATA SEED
-- ============================================================
-- Purpose: insert >=10,000 synthetic rows into each primary table so the
--          admin-portal-performance measurement procedure (Requirement 7) can
--          be run at representative data volume.
--
-- Referenced by: .kiro/specs/admin-portal-performance/performance-measurement.md (§2.1)
--
-- ⚠️  TEST / STAGING DATABASE ONLY — NEVER RUN AGAINST PRODUCTION.
--     This script inserts thousands of synthetic auth users + profiles and
--     dependent rows. It is insert-only (never updates/deletes real data) and
--     idempotent (deterministic IDs + ON CONFLICT DO NOTHING), but it pollutes
--     the data set. Always point it at a disposable database.
--
-- Safety opt-in (FAIL-CLOSED): the script aborts unless you explicitly set
--     SET perf.seed_confirm = 'yes';
-- before running it. Example:
--     psql "$DIRECT_URL" -c "SET perf.seed_confirm = 'yes';" -f scripts/seed-perf-data.sql
--
-- Idempotent: re-running does NOT create duplicates. All synthetic rows carry
-- stable, recognizable markers:
--   * auth.users / profiles email  ->  perfseed+<n>@perf.seed.local
--   * payments txnid               ->  PERFSEED-<n>
--   * events / announcements slug  ->  perf-seed-event-<n> / perf-seed-ann-<n>
--   * forum category slug          ->  perf-seed-category
-- Cleanup: scripts/cleanup-perf-data.sql (same opt-in).
--
-- Volume: change the `target` constant below (default 12000, comfortably > 10k).
-- ============================================================

-- ---- 0. Fail-closed guard -------------------------------------------------
DO $guard$
BEGIN
  IF coalesce(current_setting('perf.seed_confirm', true), '') <> 'yes' THEN
    RAISE EXCEPTION
      'Refusing to seed: set "SET perf.seed_confirm = ''yes'';" first, and only on a TEST/STAGING database.';
  END IF;
END
$guard$;

BEGIN;

-- ---- 1. auth.users (profiles.id references auth.users(id)) ----------------
-- Minimal valid auth rows so profiles FK is satisfied. Deterministic UUIDs.
-- If your Supabase auth schema requires extra NOT NULL columns, add them here.
DO $seed_auth$
DECLARE
  target int := 12000;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  SELECT
    '00000000-0000-0000-0000-000000000000'::uuid,
    ('00000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
    'authenticated',
    'authenticated',
    'perfseed+' || i || '@perf.seed.local',
    '',                       -- empty password hash; these accounts never log in
    now(),
    '{"provider":"perfseed","providers":["perfseed"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  FROM generate_series(1, target) AS s(i)
  ON CONFLICT (id) DO NOTHING;
END
$seed_auth$;

-- ---- 2. profiles ----------------------------------------------------------
-- Varies approval_status / role / is_paid_member to exercise filter indexes.
DO $seed_profiles$
DECLARE
  target int := 12000;
BEGIN
  INSERT INTO profiles (
    id, full_name, email, batch_year, course,
    role, approval_status, is_paid_member, current_city, created_at
  )
  SELECT
    ('00000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
    'Perf Seed User ' || i,
    'perfseed+' || i || '@perf.seed.local',
    1990 + (i % 35),
    (ARRAY['B.Sc','B.Com','B.A','M.Sc','MBA'])[1 + (i % 5)],
    'alumni'::user_role,
    (ARRAY['approved','pending','rejected'])[1 + (i % 3)]::approval_status,
    (i % 2 = 0),
    (ARRAY['Patna','Delhi','Mumbai','Bengaluru','Kolkata'])[1 + (i % 5)],
    now() - (i || ' minutes')::interval
  FROM generate_series(1, target) AS s(i)
  ON CONFLICT (id) DO NOTHING;
END
$seed_profiles$;

-- ---- 3. payments ----------------------------------------------------------
-- Varies status to exercise the payments filters / aggregates.
DO $seed_payments$
DECLARE
  target int := 12000;
BEGIN
  INSERT INTO payments (
    id, alumni_id, txnid, amount, currency, status, created_at
  )
  SELECT
    ('00000000-0000-4000-8001-' || lpad(to_hex(i), 12, '0'))::uuid,
    ('00000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,  -- 1:1 with profile i
    'PERFSEED-' || i,
    500 + (i % 10) * 100,
    'INR',
    (ARRAY['success','pending','failed'])[1 + (i % 3)]::payment_status,
    now() - (i || ' minutes')::interval
  FROM generate_series(1, target) AS s(i)
  ON CONFLICT (txnid) DO NOTHING;
END
$seed_payments$;

-- ---- 4. events ------------------------------------------------------------
-- All authored by the first seeded profile.
DO $seed_events$
DECLARE
  target int := 12000;
  author uuid := '00000000-0000-4000-8000-000000000001'::uuid;
BEGIN
  INSERT INTO events (
    id, title, slug, description, starts_at, is_published, created_by, created_at
  )
  SELECT
    ('00000000-0000-4000-8002-' || lpad(to_hex(i), 12, '0'))::uuid,
    'Perf Seed Event ' || i,
    'perf-seed-event-' || i,
    'Synthetic event row for performance measurement.',
    now() + (i || ' hours')::interval,
    (i % 2 = 0),
    author,
    now() - (i || ' minutes')::interval
  FROM generate_series(1, target) AS s(i)
  ON CONFLICT (slug) DO NOTHING;
END
$seed_events$;

-- ---- 5. announcements -----------------------------------------------------
DO $seed_ann$
DECLARE
  target int := 12000;
  author uuid := '00000000-0000-4000-8000-000000000001'::uuid;
BEGIN
  INSERT INTO announcements (
    id, title, slug, content, author_id, is_published, published_at, created_at
  )
  SELECT
    ('00000000-0000-4000-8003-' || lpad(to_hex(i), 12, '0'))::uuid,
    'Perf Seed Announcement ' || i,
    'perf-seed-ann-' || i,
    'Synthetic announcement body for performance measurement.',
    author,
    (i % 2 = 0),
    CASE WHEN (i % 2 = 0) THEN now() - (i || ' minutes')::interval ELSE NULL END,
    now() - (i || ' minutes')::interval
  FROM generate_series(1, target) AS s(i)
  ON CONFLICT (slug) DO NOTHING;
END
$seed_ann$;

-- ---- 6. forum_threads -----------------------------------------------------
-- Ensure a dedicated synthetic category exists, then seed threads under it.
INSERT INTO forum_categories (name, description, slug, display_order)
VALUES ('Perf Seed', 'Synthetic category for performance measurement', 'perf-seed-category', 999)
ON CONFLICT (slug) DO NOTHING;

DO $seed_forum$
DECLARE
  target int := 12000;
  author uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  cat uuid;
BEGIN
  SELECT id INTO cat FROM forum_categories WHERE slug = 'perf-seed-category';

  INSERT INTO forum_threads (
    id, category_id, author_id, title, content, created_at
  )
  SELECT
    ('00000000-0000-4000-8004-' || lpad(to_hex(i), 12, '0'))::uuid,
    cat,
    author,
    'Perf Seed Thread ' || i,
    'Synthetic forum thread body for performance measurement.',
    now() - (i || ' minutes')::interval
  FROM generate_series(1, target) AS s(i)
  ON CONFLICT (id) DO NOTHING;
END
$seed_forum$;

COMMIT;

-- ---- 7. Verify volume -----------------------------------------------------
SELECT 'profiles'       AS table, count(*) FROM profiles       WHERE email LIKE 'perfseed+%@perf.seed.local'
UNION ALL SELECT 'payments',       count(*) FROM payments       WHERE txnid LIKE 'PERFSEED-%'
UNION ALL SELECT 'events',         count(*) FROM events         WHERE slug  LIKE 'perf-seed-event-%'
UNION ALL SELECT 'announcements',  count(*) FROM announcements  WHERE slug  LIKE 'perf-seed-ann-%'
UNION ALL SELECT 'forum_threads',  count(*) FROM forum_threads  WHERE title LIKE 'Perf Seed Thread %'
ORDER BY 1;
