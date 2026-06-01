/**
 * Helpers for building safe Supabase/PostgREST queries from user input.
 *
 * PostgREST parses the value side of filters like `.or()` and `.ilike()` as a
 * mini expression language. Characters such as commas, parentheses, double
 * quotes, and backslashes have special meaning, so raw user input can break the
 * filter or be abused to widen/alter it (filter injection). These helpers
 * neutralise that input before it reaches the query builder.
 */

/**
 * Escape a value used inside a PostgREST `ilike` pattern.
 *
 * - Strips characters that terminate or restructure an `.or()` expression
 *   (commas, parentheses, quotes, backslashes).
 * - Escapes LIKE wildcards (`%`, `_`) so a user searching for "50%" doesn't get
 *   treated as a wildcard match.
 */
export function escapeIlikePattern(value: string): string {
  return value
    .replace(/[\\%_]/g, (char) => `\\${char}`)
    .replace(/[(),"']/g, ' ')
    .trim();
}

/**
 * Normalise and bound a free-text search term before using it in a query.
 * Returns null when there is nothing meaningful to search for.
 */
export function normalizeSearchTerm(
  value: string | null | undefined,
  maxLength = 100
): string | null {
  if (!value) return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}
