import { describe, expect, it } from 'vitest';
import { REVALIDATE } from '@/lib/cache/admin-cache';

/**
 * Configuration smoke assertions for the admin cache revalidation windows.
 *
 * These guard the upper bounds mandated by Requirement 4 so that an accidental
 * widening of a revalidation window is caught at test time rather than serving
 * stale data beyond the allowed freshness budget:
 *  - badge     ≤ 60s  (Req 4.5: pending-approvals badge)
 *  - stats     ≤ 120s (Req 4.7: portal statistics other than the badge)
 *  - reference ≤ 300s (Req 4.6: reference data)
 */
describe('admin-cache REVALIDATE windows', () => {
  it('keeps the badge window within 60 seconds (Req 4.5)', () => {
    expect(REVALIDATE.badge).toBeLessThanOrEqual(60);
  });

  it('keeps the stats window within 120 seconds (Req 4.7)', () => {
    expect(REVALIDATE.stats).toBeLessThanOrEqual(120);
  });

  it('keeps the reference window within 300 seconds (Req 4.6)', () => {
    expect(REVALIDATE.reference).toBeLessThanOrEqual(300);
  });
});
