/**
 * Pure count-rendering seam (design "Data Models" → "Count result", and
 * Correctness Property 12: "Approximate counts are labeled, exact counts are not").
 *
 * A list count is either exact or an estimate (planner statistics). This module
 * owns the shared {@link CountResult} type and the pure {@link formatCount}
 * renderer. The data-access `getListCount` helper (task 8.2) lives in
 * `lib/db/estimated-count.ts` and imports {@link CountResult} from here.
 *
 * Extracted as a pure function (no I/O, deterministic) so it can be covered by
 * property-based tests (Property 12 — Requirement 9.3).
 */

/**
 * Result of a list count.
 *
 * - `count` — the number of matching rows (exact value, or planner estimate).
 * - `isEstimated` — `true` when `count` came from the planner's estimate and
 *   therefore MUST be rendered with a visible "approximate" indicator and never
 *   presented as an exact total; `false` when `count` is exact.
 *
 * See design "Data Models" → "Count result".
 */
export interface CountResult {
  count: number;
  isEstimated: boolean;
}

/**
 * Render a {@link CountResult} as a human-readable display string.
 *
 * Pure and deterministic. Thousands separators reuse the project's existing
 * number-formatting locale (`en-IN`, matching `lib/utils/format.ts`).
 *
 * - Exact count (`isEstimated === false`): the formatted number on its own,
 *   e.g. `1,200`. No approximate indicator is ever added.
 * - Estimated count (`isEstimated === true`): a leading `~` marker plus a
 *   trailing `(approximate)` label, e.g. `~1,200 (approximate)`, so the value
 *   can never be mistaken for an exact total.
 *
 * This is the if-and-only-if labeling required by Requirement 9.3 / Property 12:
 * the approximate indicator is present exactly when `isEstimated` is `true`.
 *
 * @param result The count and whether it is an estimate.
 * @returns The display string.
 */
export function formatCount(result: CountResult): string {
  const formatted = new Intl.NumberFormat('en-IN').format(result.count);
  return result.isEstimated ? `~${formatted} (approximate)` : formatted;
}
