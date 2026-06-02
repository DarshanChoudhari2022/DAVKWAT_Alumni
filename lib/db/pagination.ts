/**
 * Pure pagination-math seam (design Section 5, "Pagination reachability under estimates").
 *
 * Estimated counts (planner statistics) may be lower than the true number of matching
 * rows. If `totalPages` were derived from the estimate alone, real rows could become
 * unreachable through the pagination controls. This function guarantees every real row is
 * reachable: while the current page is full there is always at least one more page, and a
 * page returning fewer than `pageSize` rows is recognized as terminal.
 *
 * effectiveCount = max(estimate, offset + rowsReturned + (fullPage ? pageSize : 0))
 *
 * Extracted as a pure function (no I/O) so it can be covered by property-based tests
 * (Property 11: Pagination reachability under estimated counts — Requirements 5.2).
 */

export interface ComputePaginationInput {
  /** Number of rows the current page actually returned from the List_Query. */
  rowsReturned: number;
  /** Configured page size (rows per page). */
  pageSize: number;
  /** Current 1-based page number. */
  page: number;
  /** Estimated total matching-row count (may be inaccurate, e.g. planner estimate). */
  estimate: number;
}

export interface PaginationResult {
  /** Total number of pages to expose in pagination controls (always >= 1). */
  totalPages: number;
  /** Whether at least one further page is reachable after the current page. */
  hasNext: boolean;
}

/**
 * Compute pagination metadata that stays correct even when `estimate` is inaccurate.
 *
 * Inputs are clamped defensively: `page` and `pageSize` are forced to be >= 1, and
 * `rowsReturned` and `estimate` are forced to be non-negative integers. `rowsReturned` is
 * also capped at `pageSize`, since a single page can never return more rows than its size.
 */
export function computePagination({
  rowsReturned,
  pageSize,
  page,
  estimate,
}: ComputePaginationInput): PaginationResult {
  // Defensive clamping: tolerate out-of-range or fractional inputs.
  const safePageSize = Math.max(1, Math.floor(pageSize) || 1);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeEstimate = Math.max(0, Math.floor(estimate) || 0);
  const safeRowsReturned = Math.min(
    safePageSize,
    Math.max(0, Math.floor(rowsReturned) || 0)
  );

  const offset = (safePage - 1) * safePageSize;
  // A page is "full" (and therefore not terminal) when it returned exactly pageSize rows.
  const fullPage = safeRowsReturned === safePageSize;

  // Guarantee reachability of every real row regardless of estimate error: when the
  // current page is full, expose at least one more page beyond the rows seen so far.
  const effectiveCount = Math.max(
    safeEstimate,
    offset + safeRowsReturned + (fullPage ? safePageSize : 0)
  );

  const totalPages = Math.max(1, Math.ceil(effectiveCount / safePageSize));

  return { totalPages, hasNext: fullPage };
}
