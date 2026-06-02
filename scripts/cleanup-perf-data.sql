-- ============================================================
-- DAVKAWT Admin Portal — PERFORMANCE TEST DATA CLEANUP
-- ============================================================
-- Removes ONLY the synthetic rows created by scripts/seed-perf-data.sql,
-- identified by their stable markers. It never touches real data.
--
-- Referenced by: .kiro/specs/admin-portal-performance/performance-measurement.md (§2.2)
--
-- ⚠️  TEST / STAGING DATABASE ONLY — NEVER RUN AGAINST PRODUCTION.
--
-- Safety opt-in (FAIL-CLOSED): aborts unless you set
--     SET perf.seed_confirm = 'yes';
-- Example:
--     psql "$DIRECT_URL" -c "SET perf.seed_confirm = 'yes';" -f scripts/cleanup-perf-data.sql
--
-- Deletion order respects foreign keys. Deleting profiles cascades to their
-- payments/RSVPs; deleting auth.users cascades to profiles. We delete the
-- dependent synthetic rows explicitly first to be safe and predictable.
-- ============================================================

-- ---- 0. Fail-closed guard -------------------------------------------------
DO $guard$
BEGIN
  IF coalesce(current_setting('perf.seed_confirm', true), '') <> 'yes' THEN
    RAISE EXCEPTION
      'Refusing to clean: set "SET perf.seed_confirm = ''yes'';" first, and only on a TEST/STAGING database.';
  END IF;
END
$guard$;

BEGIN;

-- forum threads + their category
DELETE FROM forum_threads WHERE title LIKE 'Perf Seed Thread %';
DELETE FROM forum_categories WHERE slug = 'perf-seed-category';

-- announcements + events
DELETE FROM announcements WHERE slug LIKE 'perf-seed-ann-%';
DELETE FROM events        WHERE slug LIKE 'perf-seed-event-%';

-- payments (also removed via profile cascade, deleted explicitly for clarity)
DELETE FROM payments WHERE txnid LIKE 'PERFSEED-%';

-- profiles (FK to auth.users) then the auth.users rows.
-- Deleting auth.users cascades to profiles via ON DELETE CASCADE, but we delete
-- profiles first explicitly so dependent rows are gone deterministically.
DELETE FROM profiles  WHERE email LIKE 'perfseed+%@perf.seed.local';
DELETE FROM auth.users WHERE email LIKE 'perfseed+%@perf.seed.local';

COMMIT;

-- ---- Verify removal -------------------------------------------------------
SELECT 'profiles'       AS table, count(*) FROM profiles       WHERE email LIKE 'perfseed+%@perf.seed.local'
UNION ALL SELECT 'payments',       count(*) FROM payments       WHERE txnid LIKE 'PERFSEED-%'
UNION ALL SELECT 'events',         count(*) FROM events         WHERE slug  LIKE 'perf-seed-event-%'
UNION ALL SELECT 'announcements',  count(*) FROM announcements  WHERE slug  LIKE 'perf-seed-ann-%'
UNION ALL SELECT 'forum_threads',  count(*) FROM forum_threads  WHERE title LIKE 'Perf Seed Thread %'
ORDER BY 1;
