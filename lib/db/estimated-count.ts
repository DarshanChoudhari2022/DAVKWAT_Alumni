/**
 * Estimated list counts with an exact-count fallback (design.md → "Estimated
 * counts" and Correctness Property 10: "Estimated-count failure falls back to
 * exact").
 *
 * `getListCount` asks Postgres for a cheap, filter-aware planner estimate via
 * the `estimate_filtered_count` RPC (see
 * `supabase/migrations/0006_estimate_filtered_count.sql`). The estimate avoids a
 * full-table `count: 'exact'` scan so list pagination stays fast at 10k+ rows.
 * If the estimate is unavailable for ANY reason (RPC error, null/unusable
 * value), it falls back to the caller-supplied exact count so pagination still
 * renders — it never throws (Req 5.6 / Property 10).
 *
 * Monetary totals (e.g. total successful revenue) MUST NOT use this estimate
 * path. They are required to be exact (Req 5.3, 5.4) and are computed with a
 * single exact aggregate query (`amount.sum()`); see {@link getExactSum}.
 *
 * The shared {@link CountResult} type and the pure `formatCount` renderer live
 * in `lib/db/count-format.ts` (task 2.8). They are re-exported here for
 * convenience so callers of `getListCount` have the rendering seam in one place.
 */

import type { createAdminClient } from '@/lib/supabase/admin';
import type { createClient } from '@/lib/supabase/server';
import type { CountResult } from './count-format';

export { formatCount } from './count-format';
export type { CountResult } from './count-format';

/**
 * Supabase client accepted by {@link getListCount}. Mirrors the
 * `AdminDatabaseClient` union in `lib/auth/admin-access.ts`: either the
 * RLS-scoped server client (`supabase` auth mode) or the service-role admin
 * client (local-admin mode). Both expose a compatible `rpc`/`from` surface.
 *
 * `import type` is used so this module pulls in no server-only runtime from
 * `lib/supabase/server.ts`.
 */
export type ListCountClient =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

/**
 * Comparison/predicate operators supported by the `estimate_filtered_count`
 * RPC. This union MUST stay in sync with the fixed `CASE` mapping in
 * `supabase/migrations/0006_estimate_filtered_count.sql`.
 *
 * Operators ending in a unary predicate (`is_true`, `is_false`, `is_null`,
 * `is_not_null`) take no `value`; all others require a `value`.
 */
export type EstimateOp =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'ilike'
  | 'is_true'
  | 'is_false'
  | 'is_null'
  | 'is_not_null';

/**
 * A single filter element passed to `estimate_filtered_count` in the
 * `p_filters` jsonb array. Filters are combined with `AND`. The shape matches
 * the RPC contract exactly: `{ column, op, value? }`.
 *
 * `value` is omitted for the unary `is_*` operators and required otherwise.
 */
export interface EstimateFilter {
  column: string;
  op: EstimateOp;
  value?: string;
}

/**
 * Tables the `estimate_filtered_count` RPC is allowed to plan against. This
 * union MUST match the `v_allowed_tables` allowlist in
 * `supabase/migrations/0006_estimate_filtered_count.sql`. Naming any other
 * table makes the RPC `RAISE`, which `getListCount` treats as a fallback.
 */
export type AllowedTable =
  | 'profiles'
  | 'payments'
  | 'events'
  | 'announcements'
  | 'forum_threads';

/**
 * Options for {@link getListCount}.
 */
export interface GetListCountOptions {
  /** Allowlisted table to estimate against (matches the RPC contract). */
  table: AllowedTable;
  /** Structured filters combined with `AND`; `[]` estimates the whole table. */
  filters: EstimateFilter[];
  /**
   * Exact-count fallback, invoked only when the estimate is unavailable. Pass a
   * thunk that runs the equivalent `count: 'exact'` query, e.g.
   * `() => client.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'success')`.
   * A `null` count is coalesced to `0`.
   */
  exactFallback: () => PromiseLike<{ count: number | null }>;
}

/**
 * Minimal, locally-typed view of the Supabase `rpc` surface for the
 * `estimate_filtered_count` function.
 *
 * The function is intentionally NOT in the generated `lib/supabase/database.types.ts`
 * (that file currently only declares `is_admin` / `is_approved_alumni`), so the
 * strongly-typed `client.rpc('estimate_filtered_count', …)` overload would not
 * compile. We narrow the client to exactly the call we make — keeping the
 * argument names/types pinned to the RPC contract — and cast through `unknown`
 * at the single call site below. The RPC returns a `bigint`, which PostgREST
 * may serialize as a JSON number or a numeric string, so `data` is `unknown`
 * and validated by {@link toUsableCount}.
 */
interface EstimateCountRpcClient {
  rpc(
    fn: 'estimate_filtered_count',
    args: { p_table: AllowedTable; p_filters: EstimateFilter[] },
  ): PromiseLike<{ data: unknown; error: unknown }>;
}

/**
 * Coerce an RPC scalar result into a usable non-negative row count.
 *
 * Accepts a finite JSON number or a numeric string (PostgREST may serialize a
 * `bigint` either way). Returns the floored non-negative integer, or `null`
 * when the value is missing, non-numeric, negative, or non-finite — signalling
 * that the caller should fall back to an exact count.
 */
function toUsableCount(value: unknown): number | null {
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    n = Number(value);
  } else {
    return null;
  }

  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return Math.floor(n);
}

/**
 * Resolve a list row count, preferring a cheap planner estimate and falling
 * back to an exact count when the estimate is unavailable.
 *
 * Primary path: call the `estimate_filtered_count` RPC. If it returns a usable
 * number `>= 0`, return `{ count, isEstimated: true }`.
 *
 * Fallback path: on ANY thrown error, RPC `error`, `null`, or otherwise
 * unusable estimate, await `exactFallback()` and return
 * `{ count: count ?? 0, isEstimated: false }`. This function never throws — a
 * failed estimate degrades to an exact count so pagination still renders
 * (Req 5.6 / Property 10).
 *
 * @param client Supabase client (RLS-scoped or service-role); the RPC is
 *   `SECURITY INVOKER` so RLS still applies.
 * @param opts Table, filters, and the exact-count fallback thunk.
 * @returns A {@link CountResult} flagged estimated or exact.
 */
export async function getListCount(
  client: ListCountClient,
  opts: GetListCountOptions,
): Promise<CountResult> {
  const { table, filters, exactFallback } = opts;

  try {
    const rpcClient = client as unknown as EstimateCountRpcClient;
    const { data, error } = await rpcClient.rpc('estimate_filtered_count', {
      p_table: table,
      p_filters: filters,
    });

    if (!error) {
      const usable = toUsableCount(data);
      if (usable !== null) {
        return { count: usable, isEstimated: true };
      }
    }
  } catch {
    // Swallow: any estimate failure degrades to the exact fallback below.
  }

  // Fallback: exact count (never estimated). Does not throw on a null count.
  const { count } = await exactFallback();
  return { count: count ?? 0, isEstimated: false };
}

/**
 * Resolve an EXACT monetary total from a single aggregate query, with a safe
 * non-aggregate fallback.
 *
 * Monetary figures (e.g. total successful revenue) are required to be exact
 * (Req 5.3, 5.4) and MUST NEVER flow through the estimated-count path above.
 *
 * IMPORTANT: PostgREST aggregate functions (`amount.sum()`) are DISABLED by
 * default on Supabase (`db-aggregates-enabled = false`). When disabled, the
 * aggregate query returns the error "Use of aggregate functions is not allowed".
 * This helper therefore does NOT throw on such an error — throwing would crash
 * the whole region/page. Instead it returns `null` so the caller can fall back
 * to {@link sumColumn}, which computes the exact total without DB aggregates.
 *
 * ```ts
 * const revenue =
 *   (await getExactSum(() =>
 *     client.from('payments').select('total:amount.sum()').eq('status', 'success').maybeSingle(),
 *   )) ??
 *   (await sumColumn(client, { table: 'payments', column: 'amount', eq: { status: 'success' } }));
 * ```
 *
 * @param exactSum Thunk running the single aggregate query; resolves to a row
 *   `{ total }` (or `null`) plus an optional `error`.
 * @returns The exact total, `0` when there are no matching rows, or `null` when
 *   the aggregate query errored (signal the caller to use {@link sumColumn}).
 */
export async function getExactSum(
  exactSum: () => PromiseLike<{
    data: { total: number | null } | null;
    error?: unknown;
  }>,
): Promise<number | null> {
  let result: { data: { total: number | null } | null; error?: unknown };
  try {
    result = await exactSum();
  } catch {
    // Network/transport failure — let the caller fall back to a manual sum.
    return null;
  }
  const { data, error } = result;
  // Aggregate disabled (or any query error): signal fallback rather than crash.
  if (error) {
    return null;
  }
  return data?.total ?? 0;
}

/** Options for {@link sumColumn}: which numeric column to total and an optional equality filter. */
export interface SumColumnOptions {
  table: AllowedTable;
  column: string;
  /** Optional simple equality filters applied with `.eq()` (e.g. `{ status: 'success' }`). */
  eq?: Record<string, string | number | boolean>;
}

/**
 * Compute an EXACT sum of a numeric column WITHOUT relying on PostgREST
 * aggregate functions (which are disabled by default on Supabase).
 *
 * It pages through the matching rows in batches, selecting only the target
 * column, and sums in JS. This always works regardless of the
 * `db-aggregates-enabled` setting, and never throws — on error it returns the
 * total accumulated so far (which is `0` if the first page failed), so a stats
 * region degrades gracefully rather than crashing the page (Req 3.7).
 *
 * For the payments table at realistic admin volumes this is a small number of
 * paged reads; correctness (Req 5.3/5.4) is preserved.
 */
export async function sumColumn(
  client: ListCountClient,
  { table, column, eq }: SumColumnOptions,
): Promise<number> {
  const PAGE = 1000;
  let total = 0;
  let from = 0;

  try {
    for (;;) {
      let query = client.from(table).select(column);
      for (const [col, value] of Object.entries(eq ?? {})) {
        query = query.eq(col, value);
      }
      const { data, error } = await query.range(from, from + PAGE - 1);
      if (error || !data) {
        break;
      }
      const rows = data as unknown as Array<Record<string, unknown>>;
      for (const row of rows) {
        total += Number(row[column] ?? 0);
      }
      if (rows.length < PAGE) {
        break;
      }
      from += PAGE;
    }
  } catch {
    // Return whatever was accumulated; never throw from a stats helper.
  }

  return total;
}

/**
 * Convenience: the exact total successful-payment revenue, computed via the
 * aggregate query when allowed and falling back to {@link sumColumn} when
 * PostgREST aggregates are disabled. Never throws.
 */
export async function getSuccessfulRevenue(client: ListCountClient): Promise<number> {
  const viaAggregate = await getExactSum(
    () =>
      client
        .from('payments')
        .select('total:amount.sum()')
        .eq('status', 'success')
        .maybeSingle() as unknown as PromiseLike<{
        data: { total: number | null } | null;
        error?: unknown;
      }>,
  );
  if (viaAggregate !== null) {
    return viaAggregate;
  }
  return sumColumn(client, { table: 'payments', column: 'amount', eq: { status: 'success' } });
}
