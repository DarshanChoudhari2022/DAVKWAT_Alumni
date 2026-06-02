// Feature: admin-portal-performance, Property 11: Pagination reachability under estimated counts
//
// **Validates: Requirements 5.2**
//
// Property 11 (design Section 5, "Pagination reachability under estimated counts"):
//
//   For ANY true matching-row count, ANY (possibly inaccurate) estimated count, ANY
//   positive page size, and ANY current page, the pagination model lets navigation reach
//   the page containing the last real row: while a page returns a full page of rows at
//   least one further page is reachable, and a page returning fewer than the page size is
//   recognized as terminal.
//
// We model the true number of matching rows `T`. For a page at 1-based index `page` the
// offset is `(page - 1) * pageSize` and the rows the List_Query would actually return are
// `clamp(T - offset, 0, pageSize)`. The estimate is deliberately allowed to be wrong in
// either direction (gross underestimates including 0, and overestimates) to prove that
// reachability does not depend on estimate accuracy.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { computePagination } from '@/lib/db/pagination';

const NUM_RUNS = 200; // comfortably exceeds the required >= 100 iterations

/** Rows the List_Query returns for a given page over `T` true rows. */
function rowsReturnedFor(T: number, offset: number, pageSize: number): number {
  return Math.max(0, Math.min(pageSize, T - offset));
}

/** 1-based index of the page that contains the last real row (page 1 when there are none). */
function lastRealRowPage(T: number, pageSize: number): number {
  if (T <= 0) return 1;
  return Math.ceil(T / pageSize);
}

describe('Property 11: Pagination reachability under estimated counts', () => {
  // T (>= 0), estimate (>= 0, may be wrong either way), pageSize (>= 1), page (>= 1).
  const scenario = fc.record({
    trueTotal: fc.nat({ max: 2000 }),
    estimate: fc.nat({ max: 5000 }), // includes 0 (gross underestimate) and overestimates
    pageSize: fc.integer({ min: 1, max: 200 }),
    page: fc.integer({ min: 1, max: 300 }), // includes pages beyond the data (empty pages)
  });

  it('reports hasNext + totalPages correctly for full and terminal pages (totalPages >= 1)', () => {
    fc.assert(
      fc.property(scenario, ({ trueTotal: T, estimate, pageSize, page }) => {
        const offset = (page - 1) * pageSize;
        const rowsReturned = rowsReturnedFor(T, offset, pageSize);

        const { hasNext, totalPages } = computePagination({
          rowsReturned,
          pageSize,
          page,
          estimate,
        });

        // totalPages is always at least one page, so the controls never collapse to zero.
        expect(totalPages).toBeGreaterThanOrEqual(1);

        if (rowsReturned === pageSize) {
          // A full page is never terminal: hasNext must be true and at least one more page
          // must be exposed beyond the current page, regardless of how low the estimate is.
          expect(hasNext).toBe(true);
          expect(totalPages).toBeGreaterThanOrEqual(page + 1);
        } else {
          // A short/terminal page (fewer rows than pageSize, including an empty page) must
          // never advertise a next page, regardless of how high the estimate is.
          expect(hasNext).toBe(false);
        }

        // Whenever strictly more real rows exist after this page, the page is full and a
        // further page must be reachable, regardless of how low the estimate is.
        if (offset + pageSize < T) {
          expect(hasNext).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('always exposes enough pages to reach the page containing the last real row', () => {
    fc.assert(
      fc.property(scenario, ({ trueTotal: T, estimate, pageSize }) => {
        const target = lastRealRowPage(T, pageSize);

        // Walk forward from page 1 the way a user clicking "next" would. At every page
        // before the target the model must allow advancing (either hasNext is true or
        // totalPages already extends past the current page), so navigation never gets
        // stuck before the last real row even when the estimate is far too low.
        for (let page = 1; page < target; page += 1) {
          const offset = (page - 1) * pageSize;
          const rowsReturned = rowsReturnedFor(T, offset, pageSize);
          const { totalPages, hasNext } = computePagination({
            rowsReturned,
            pageSize,
            page,
            estimate,
          });

          expect(hasNext || totalPages > page).toBe(true);
        }

        // On the page that actually contains the last real row, totalPages must include
        // that page so it is selectable — this is what guarantees the last row is
        // reachable regardless of estimate error (under- or over-estimate).
        const targetOffset = (target - 1) * pageSize;
        const targetRows = rowsReturnedFor(T, targetOffset, pageSize);
        const { totalPages } = computePagination({
          rowsReturned: targetRows,
          pageSize,
          page: target,
          estimate,
        });

        expect(totalPages).toBeGreaterThanOrEqual(target);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
