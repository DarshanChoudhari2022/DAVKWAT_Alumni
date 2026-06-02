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
 * Resolve an EXACT monetary total from a single aggregate query.
 *
 * Monetary figures (e.g. total successful revenue) are required to be exact
 * (Req 5.3, 5.4) and MUST NEVER flow through the estimated-count path above.
 * Compute them with a single aggregate query rather than fetching rows, e.g.:
 *
 * ```ts
 * const revenue = await getExactSum(() =>
 *   client
 *     .from('payments')
 *     .select('total:amount.sum()')
 *     .eq('status', 'success')
 *     .maybeSingle(),
 * );
 * ```
 *
 * Unlike {@link getListCount}, this helper does NOT silently swallow errors: a
 * failed aggregate throws so the calling region can render a scoped error
 * (Req 3.7) rather than display a misleading `0` total. A successful query with
 * a `null`/absent total (no matching rows) coalesces to `0`.
 *
 * @param exactSum Thunk running the single aggregate query; resolves to a row
 *   `{ total }` (or `null`) plus an optional `error`.
 * @returns The exact total, or `0` when there are no matching rows.
 * @throws If the aggregate query reports an error.
 */
export async function getExactSum(
  exactSum: () => PromiseLike<{
    data: { total: number | null } | null;
    error?: unknown;
  }>,
): Promise<number> {
  const { data, error } = await exactSum();
  if (error) {
    throw error instanceof Error
      ? error
      : new Error('getExactSum: aggregate query failed');
  }
  return data?.total ?? 0;
}
