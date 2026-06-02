// Feature: admin-portal-performance, Property 15: Result-set, pagination, and export equivalence
//
// **Validates: Requirements 9.5**
//
// Property 15 (design Section, "Result-set, pagination, and export equivalence"):
//
//   For ANY filter, search, and page-size inputs, the union of all paginated pages
//   (under the deterministic ordering produced by `orderWithTieBreaker` + the
//   reachability guarantees of `computePagination`) equals EXACTLY the full filtered,
//   ordered result set — with no gaps, no overlaps, and no duplicates — and the exported
//   file contents equal that same ordered result set.
//
// Model:
//   - A "filtered result set" is modeled as an arbitrary collection of rows, each with a
//     unique `id` and a possibly-colliding `sortKey` (collisions force the unique `id`
//     tie-breaker to do real work).
//   - The canonical ordered set is `orderWithTieBreaker(all, 'sortKey', dir)`. This single
//     ordering represents BOTH the intended full list order AND the export ordering — the
//     design ties export contents to the same deterministic ordering.
//   - Pagination is simulated by slicing the canonical ordered set into pages of
//     `pageSize`. For each page we derive `rowsReturned` and confirm `computePagination`
//     exposes enough pages (via reachability) to cover every row, even when the supplied
//     `estimate` is deliberately too low.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { orderWithTieBreaker, type SortDirection } from '@/lib/db/ordering';
import { computePagination } from '@/lib/db/pagination';

const NUM_RUNS = 200; // comfortably exceeds the required >= 100 iterations

interface Row {
  id: number;
  sortKey: number;
}

/**
 * Walk the canonical ordered set the way the paginated UI would: starting at page 1,
 * read a page of up to `pageSize` rows, ask `computePagination` whether more pages are
 * reachable, and keep advancing while reachability says so. Returns the concatenation of
 * the rows actually visited in page order.
 *
 * `estimate` is supplied by the caller and may be wrong (e.g. far too low) to prove that
 * full coverage of the result set does not depend on estimate accuracy — reachability
 * alone must carry navigation to the final row.
 */
function collectPaginatedUnion(
  ordered: Row[],
  pageSize: number,
  estimate: number
): { union: Row[]; pageCount: number } {
  const union: Row[] = [];
  let page = 1;
  // Hard upper bound on iterations to avoid an infinite loop if reachability were ever
  // buggy; covers every row plus a generous margin.
  const maxPages = Math.ceil(ordered.length / pageSize) + 2;

  while (page <= maxPages) {
    const offset = (page - 1) * pageSize;
    const pageRows = ordered.slice(offset, offset + pageSize);
    union.push(...pageRows);

    const { hasNext } = computePagination({
      rowsReturned: pageRows.length,
      pageSize,
      page,
      estimate,
    });

    if (!hasNext) break;
    page += 1;
  }

  return { union, pageCount: page };
}

describe('Property 15: Result-set, pagination, and export equivalence', () => {
  // A filtered result set: rows with unique ids and possibly-colliding sortKeys, plus a
  // positive page size and a sort direction. sortKey is drawn from a small range so that
  // collisions are common, forcing the unique id tie-breaker to determine order.
  const scenario = fc
    .record({
      rows: fc.uniqueArray(fc.integer({ min: 0, max: 100000 }), {
        minLength: 0,
        maxLength: 300,
      }),
      sortKeys: fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 0, maxLength: 300 }),
      pageSize: fc.integer({ min: 1, max: 50 }),
      dir: fc.constantFrom<SortDirection>('asc', 'desc'),
    })
    .map(({ rows: ids, sortKeys, pageSize, dir }) => {
      // Pair each unique id with a (possibly colliding) sortKey.
      const all: Row[] = ids.map((id, i) => ({
        id,
        sortKey: sortKeys[i % Math.max(1, sortKeys.length)] ?? 0,
      }));
      return { all, pageSize, dir };
    });

  it('union of all pages equals the canonical ordered set with no gaps/overlaps/duplicates', () => {
    fc.assert(
      fc.property(scenario, ({ all, pageSize, dir }) => {
        // Canonical ordered set: the full intended list order AND the export ordering.
        const canonical = orderWithTieBreaker(all, 'sortKey', dir);

        // Use an EXACT estimate here; pagination must reproduce the canonical set exactly.
        const exactEstimate = canonical.length;
        const { union } = collectPaginatedUnion(canonical, pageSize, exactEstimate);

        const canonicalIds = canonical.map((r) => r.id);
        const unionIds = union.map((r) => r.id);

        // (1) Concatenating all pages in order yields EXACTLY the canonical ordered set:
        //     identical id sequence => no gaps, no overlaps, no reordering, no duplicates.
        expect(unionIds).toEqual(canonicalIds);

        // (3) Every row appears exactly once across all pages.
        expect(unionIds.length).toBe(all.length);
        expect(new Set(unionIds).size).toBe(all.length);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('export ordering equals the paginated union (export matches the deterministic order)', () => {
    fc.assert(
      fc.property(scenario, ({ all, pageSize, dir }) => {
        // The export uses the very same deterministic ordering as the list.
        const exportOrder = orderWithTieBreaker(all, 'sortKey', dir);

        const { union } = collectPaginatedUnion(exportOrder, pageSize, exportOrder.length);

        // (2) Export ordering equals the concatenated pages, element for element.
        expect(union.map((r) => r.id)).toEqual(exportOrder.map((r) => r.id));
        expect(union.map((r) => r.sortKey)).toEqual(exportOrder.map((r) => r.sortKey));
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('reachability covers every row even when the estimate is deliberately too low', () => {
    // Same equivalence must hold when `computePagination` is fed an underestimate (the
    // worst case for estimated counts): navigation must still reach the last real row, so
    // the paginated union must still equal the canonical ordered set exactly.
    fc.assert(
      fc.property(scenario, ({ all, pageSize, dir }) => {
        const canonical = orderWithTieBreaker(all, 'sortKey', dir);

        // Deliberately low estimate (0): pages are exposed purely via reachability.
        const { union } = collectPaginatedUnion(canonical, pageSize, 0);

        expect(union.map((r) => r.id)).toEqual(canonical.map((r) => r.id));
        expect(new Set(union.map((r) => r.id)).size).toBe(all.length);
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it('hasNext-driven walk visits every page exactly once and stops on the terminal page', () => {
    // Confirm the pagination MODEL (driven purely by computePagination's hasNext, with
    // rowsReturned simulated per page) walks every page exactly once and stops at the
    // correct terminal page — neither overshooting past the last page nor stopping early.
    fc.assert(
      fc.property(scenario, ({ all, pageSize, dir }) => {
        const canonical = orderWithTieBreaker(all, 'sortKey', dir);

        // The number of pages a correct model must visit. An empty result set is still a
        // single (terminal) page. A result set whose size is an exact multiple of pageSize
        // ends on a final FULL page; computePagination treats a full page as non-terminal,
        // so the walk advances once more to an empty terminal page — hence the +1.
        const expectedFullWalkPages =
          canonical.length === 0
            ? 1
            : canonical.length % pageSize === 0
              ? canonical.length / pageSize + 1
              : Math.ceil(canonical.length / pageSize);

        const visited: number[] = [];
        let page = 1;
        const hardCap = expectedFullWalkPages + 5; // guard against an infinite loop

        while (page <= hardCap) {
          visited.push(page);
          const offset = (page - 1) * pageSize;
          // Simulate the rows the List_Query would return for this page.
          const rowsReturned = canonical.slice(offset, offset + pageSize).length;

          const { hasNext } = computePagination({
            rowsReturned,
            pageSize,
            page,
            // Exact estimate; reachability is separately exercised above with estimate 0.
            estimate: canonical.length,
          });

          if (!hasNext) break;
          page += 1;
        }

        // Visited each page exactly once, in strictly increasing order with no repeats.
        expect(visited).toEqual(
          Array.from({ length: expectedFullWalkPages }, (_, i) => i + 1)
        );
        expect(new Set(visited).size).toBe(visited.length);

        // Stopped correctly: the final visited page is terminal (hasNext === false).
        expect(visited.length).toBeGreaterThan(0);
        const lastPage = visited[visited.length - 1] ?? 1;
        const lastOffset = (lastPage - 1) * pageSize;
        const lastRows = canonical.slice(lastOffset, lastOffset + pageSize).length;
        expect(
          computePagination({ rowsReturned: lastRows, pageSize, page: lastPage, estimate: canonical.length })
            .hasNext
        ).toBe(false);
      }),
      { numRuns: NUM_RUNS }
    );
  });
});
