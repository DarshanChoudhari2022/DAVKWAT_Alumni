/**
 * Pure deterministic-ordering seam (design Section 6, "Deterministic ordering").
 *
 * Every List_Query must order by its display sort column followed by a unique
 * tie-breaker (`id`) so that rows sharing the same primary sort key (for example
 * equal `created_at`) still come back in a single, stable, total order. The real
 * Supabase queries express this as:
 *
 *   .order(sortKey, { ascending }).order('id', { ascending })
 *
 * This function mirrors that behavior in pure form: it orders by `sortKey` in the
 * requested direction, then breaks ties on the unique `id` column using the same
 * direction. Because `id` is unique, the comparator never reports two distinct rows
 * as equal, so the result is a single deterministic total order that does not depend
 * on the input array's arrival order.
 *
 * Extracted as a pure function (no I/O, input is never mutated) so it can be covered
 * by property-based tests (Property 14: Deterministic total ordering with unique
 * tie-breaker — Requirements 6.4, 9.4).
 */

/** Direction of an ordering, matching Supabase's `{ ascending }` option. */
export type SortDirection = 'asc' | 'desc';

/**
 * Treat `null`, `undefined`, and `NaN` as "nullish" so they sort to one end
 * consistently rather than producing the inconsistent results of comparing them
 * directly (e.g. every comparison with `NaN` is `false`).
 */
function isNullish(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value));
}

/**
 * Total ascending comparison of two arbitrary values.
 *
 * Defensive against mixed and edge-case inputs so the overall ordering stays a
 * total order:
 *  - nullish values (`null`/`undefined`/`NaN`) sort last (matching Postgres'
 *    default `NULLS LAST` for ascending order); when the direction is reversed by
 *    the caller they correspondingly sort first;
 *  - values of differing runtime types are ordered by their `typeof` tag so the
 *    comparison is still deterministic;
 *  - same-typed primitives compare naturally (numbers numerically, strings
 *    lexicographically, booleans `false` < `true`, bigints numerically);
 *  - anything else falls back to a stable string comparison.
 *
 * Returns a negative number when `a` sorts before `b`, positive when after, and
 * `0` only when the two values are considered equal (ties are resolved by the
 * unique `id` tie-breaker in {@link orderWithTieBreaker}).
 */
function compareAscending(a: unknown, b: unknown): number {
  const aNullish = isNullish(a);
  const bNullish = isNullish(b);
  if (aNullish && bNullish) return 0;
  if (aNullish) return 1; // nullish sorts last in ascending order
  if (bNullish) return -1;

  const aType = typeof a;
  const bType = typeof b;
  if (aType !== bType) {
    return aType < bType ? -1 : 1;
  }

  switch (aType) {
    case 'number':
    case 'bigint': {
      const an = a as number | bigint;
      const bn = b as number | bigint;
      return an < bn ? -1 : an > bn ? 1 : 0;
    }
    case 'string': {
      const as = a as string;
      const bs = b as string;
      return as < bs ? -1 : as > bs ? 1 : 0;
    }
    case 'boolean': {
      const ab = a as boolean;
      const bb = b as boolean;
      return ab === bb ? 0 : ab ? 1 : -1; // false < true
    }
    default: {
      const as = String(a);
      const bs = String(b);
      return as < bs ? -1 : as > bs ? 1 : 0;
    }
  }
}

/**
 * Return a new array of `rows` ordered by `sortKey` in `dir`, then by the unique
 * `id` column (using the same direction) as a deterministic tie-breaker.
 *
 * The input array is never mutated — a shallow copy is sorted and returned. Because
 * `id` is unique across rows, the resulting order is a single total order that is
 * independent of the arrival order of the input.
 *
 * @typeParam T A row type carrying a unique `id` of type `string | number`.
 * @param rows    The rows to order.
 * @param sortKey The display sort key to order by first.
 * @param dir     The sort direction applied to both the display key and the `id`
 *                tie-breaker (matching the real query's
 *                `.order(sortKey, { ascending }).order('id', { ascending })`).
 * @returns A new, deterministically ordered array.
 */
export function orderWithTieBreaker<T extends { id: string | number }>(
  rows: T[],
  sortKey: keyof T,
  dir: SortDirection
): T[] {
  if (!Array.isArray(rows)) return [];

  const directionFactor = dir === 'desc' ? -1 : 1;

  return [...rows].sort((a, b) => {
    const primary = compareAscending(a[sortKey], b[sortKey]) * directionFactor;
    if (primary !== 0) return primary;

    // Unique tie-breaker on `id`, in the same direction as the primary sort,
    // matching `.order('id', { ascending })` appended to the real queries.
    return compareAscending(a.id, b.id) * directionFactor;
  });
}
