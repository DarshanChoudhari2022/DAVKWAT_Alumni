// Feature: admin-portal-performance, Property 8: Writes invalidate exactly the mapped cache tags
//
// **Validates: Requirements 4.4, 9.1**
//
// Property 8 (design Section 4, "Invalidation" table):
//
//   For ANY administrator write action, the invalidation helper requests invalidation
//   of EXACTLY the set of cache tags mapped to that action type — no missing tags and
//   no unrelated/extra tags — so the first read after the write reflects the change.
//
// This test exercises the PURE `invalidateForAction(action)` seam from
// `lib/cache/invalidate.ts`. fast-check picks arbitrary actions from the
// `AdminWriteAction` union and the result is compared against an INDEPENDENT expected
// mapping defined here (raw tag-string literals, not the source `CACHE_TAGS` object) so
// the oracle does not merely re-derive the implementation. Comparison is by set
// equality (order-independent), and we additionally assert there are no duplicates and
// no missing/extra tags.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { invalidateForAction, type AdminWriteAction } from '@/lib/cache/invalidate';
import { CACHE_TAGS } from '@/lib/cache/admin-cache';

const NUM_RUNS = 200; // comfortably exceeds the required >= 100 iterations

// ─── Independent oracle ───────────────────────────────────────────────────────────
//
// Raw cache-tag string literals, defined independently of the source `CACHE_TAGS`
// constant so this test is a true external specification of the mapping rather than a
// restatement of the implementation.
const TAG = {
  statPendingApprovals: 'stat:pending-approvals',
  statDashboard: 'stat:dashboard',
  statPayments: 'stat:payments',
  referenceMembershipPlans: 'ref:membership-plans',
  referenceSiteSettings: 'ref:site-settings',
} as const;

/** The exact action → tag-set mapping per the design Section 4 invalidation table. */
const EXPECTED: Record<AdminWriteAction, string[]> = {
  approve_reject: [TAG.statPendingApprovals, TAG.statDashboard],
  alumni_edit: [TAG.statDashboard, TAG.statPayments],
  payment_status: [TAG.statPayments, TAG.statDashboard],
  settings_save: [TAG.referenceMembershipPlans, TAG.referenceSiteSettings],
  event_publish: [TAG.statDashboard],
};

/** Every action in the union, declared independently for arbitrary sampling. */
const ALL_ACTIONS: AdminWriteAction[] = [
  'approve_reject',
  'alumni_edit',
  'payment_status',
  'settings_save',
  'event_publish',
];

const actionArb = fc.constantFrom(...ALL_ACTIONS);

/** Sorted, de-duplicated copy of a tag list, for order-independent set comparison. */
function asSortedSet(tags: readonly string[]): string[] {
  return [...new Set(tags)].sort();
}

describe('Property 8: Writes invalidate exactly the mapped cache tags', () => {
  it('returns exactly the mapped tag set for any action (no missing, no extra)', () => {
    fc.assert(
      fc.property(actionArb, (action) => {
        const actual = invalidateForAction(action);
        const expected = EXPECTED[action];

        // Set equality regardless of order: same elements both directions.
        expect(asSortedSet(actual)).toEqual(asSortedSet(expected));

        // Exactly the mapped count — guards against extra OR missing tags even if a
        // spurious duplicate happened to set-match.
        expect(actual.length).toBe(expected.length);

        // No duplicate tags in the returned set.
        expect(new Set(actual).size).toBe(actual.length);

        // Every returned tag is one the action is supposed to invalidate, and every
        // expected tag is present — the explicit "no extra / no missing" statement.
        for (const tag of actual) expect(expected).toContain(tag);
        for (const tag of expected) expect(actual).toContain(tag);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('never returns an unrelated tag for any action', () => {
    const ALL_KNOWN_TAGS = Object.values(TAG);
    fc.assert(
      fc.property(actionArb, (action) => {
        const actual = invalidateForAction(action);
        // Every produced tag is a known cache tag (never a stray/unrelated string).
        for (const tag of actual) expect(ALL_KNOWN_TAGS).toContain(tag);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('returns a fresh array so callers cannot mutate the internal mapping', () => {
    fc.assert(
      fc.property(actionArb, (action) => {
        const first = invalidateForAction(action);
        // Cast to a loose array to attempt tampering with the returned value; the
        // returned array is typed as CacheTag[], but we want to prove the source
        // mapping is unaffected even by an out-of-band mutation.
        (first as string[]).push('stat:tampered');
        first.length = 0; // also try clearing it
        const second = invalidateForAction(action);
        // A subsequent call is unaffected by mutation of a prior result.
        expect(asSortedSet(second)).toEqual(asSortedSet(EXPECTED[action]));
      }),
      { numRuns: NUM_RUNS }
    );
  });

  // Sanity guard: the independent raw-string oracle agrees with the source CACHE_TAGS
  // constants. If a tag string is ever renamed in one place but not the other, this
  // fails loudly rather than letting the two drift apart silently.
  it('independent oracle tag strings match the source CACHE_TAGS constants', () => {
    expect(TAG.statPendingApprovals).toBe(CACHE_TAGS.statPendingApprovals);
    expect(TAG.statDashboard).toBe(CACHE_TAGS.statDashboard);
    expect(TAG.statPayments).toBe(CACHE_TAGS.statPayments);
    expect(TAG.referenceMembershipPlans).toBe(CACHE_TAGS.referenceMembershipPlans);
    expect(TAG.referenceSiteSettings).toBe(CACHE_TAGS.referenceSiteSettings);
  });
});
