import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { orderWithTieBreaker, type SortDirection } from '@/lib/db/ordering';

// Feature: admin-portal-performance, Property 14: Deterministic total ordering with unique tie-breaker
//
// Validates: Requirements 6.4, 9.4
//
// For ANY set of rows — including rows that share the same primary sort key
// (e.g. equal `created_at`) — ordering by the display sort key followed by the
// unique `id` tie-breaker produces a single deterministic total order that is
// independent of the rows' initial arrival order.

type Row = { id: number; k: number };

/**
 * Produce a rearrangement of `arr` driven by a fast-check-generated `seed` of
 * integers, using a type-safe decorate-sort-undecorate shuffle.
 *
 * Each element is paired with an `order` value pulled from `seed` (cycled by
 * index, falling back to the element index when the seed is empty), then the
 * pairs are sorted by `order`. This always yields a valid permutation of the
 * input for any seed (including an empty one, which preserves arrival order),
 * and never indexes the array unchecked, so it type-checks cleanly under
 * `noUncheckedIndexedAccess`.
 */
function permute<T>(arr: readonly T[], seed: readonly number[]): T[] {
  const span = Math.max(seed.length, 1);
  return arr
    .map((value, i) => ({ value, order: seed[i % span] ?? i }))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.value);
}

/**
 * Generator for an array of rows whose `id`s are unique and whose primary sort
 * key `k` is drawn from a SMALL domain (0..3) to force frequent ties on the
 * primary key.
 */
const rowsArb = fc.uniqueArray(
  fc.record({
    id: fc.integer({ min: 0, max: 10_000 }),
    k: fc.integer({ min: 0, max: 3 }),
  }),
  { selector: (r: Row) => r.id, minLength: 0, maxLength: 40 }
);

/** Several integer seeds, each used to produce a distinct shuffled permutation. */
const seedsArb = fc.array(fc.array(fc.integer({ min: 0, max: 1_000_000 }), { maxLength: 40 }), {
  minLength: 1,
  maxLength: 5,
});

const dirArb = fc.constantFrom<SortDirection>('asc', 'desc');

describe('orderWithTieBreaker — Property 14: Deterministic total ordering with unique tie-breaker', () => {
  it('produces an identical total order for every input permutation (asc and desc)', () => {
    fc.assert(
      fc.property(rowsArb, seedsArb, dirArb, (rows, seeds, dir) => {
        // Baseline ordering computed directly from the original arrival order.
        const baseline = orderWithTieBreaker(rows, 'k', dir);
        const baselineIds = baseline.map((r) => r.id);

        // --- Determinism: every shuffled arrival order yields the identical output. ---
        for (const seed of seeds) {
          const shuffled = permute(rows, seed);
          const result = orderWithTieBreaker(shuffled, 'k', dir);
          expect(result.map((r) => r.id)).toEqual(baselineIds);
        }

        // --- Permutation of the input: same multiset of ids, nothing dropped/duped. ---
        expect(baseline.length).toBe(rows.length);
        const inputIdsSorted = rows.map((r) => r.id).sort((a, b) => a - b);
        const outputIdsSorted = [...baselineIds].sort((a, b) => a - b);
        expect(outputIdsSorted).toEqual(inputIdsSorted);

        // --- True total order: sorted by primary key in `dir`, then by `id` in `dir`. ---
        for (let i = 1; i < baseline.length; i += 1) {
          const prev = baseline[i - 1];
          const curr = baseline[i];
          // Guard narrows `prev`/`curr` from `Row | undefined` to `Row` under
          // noUncheckedIndexedAccess; `i` is always in-range so this never trips.
          if (prev === undefined || curr === undefined) continue;

          if (dir === 'asc') {
            expect(prev.k).toBeLessThanOrEqual(curr.k);
            if (prev.k === curr.k) {
              // Unique tie-breaker: strictly increasing id within equal primary keys.
              expect(prev.id).toBeLessThan(curr.id);
            }
          } else {
            expect(prev.k).toBeGreaterThanOrEqual(curr.k);
            if (prev.k === curr.k) {
              // Unique tie-breaker: strictly decreasing id within equal primary keys.
              expect(prev.id).toBeGreaterThan(curr.id);
            }
          }
        }
      }),
      { numRuns: 200 }
    );
  });

  it('does not mutate the input array', () => {
    fc.assert(
      fc.property(rowsArb, dirArb, (rows, dir) => {
        const snapshot = rows.map((r) => ({ ...r }));
        orderWithTieBreaker(rows, 'k', dir);
        expect(rows).toEqual(snapshot);
      }),
      { numRuns: 100 }
    );
  });
});
