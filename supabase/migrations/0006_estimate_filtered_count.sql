-- ============================================================
-- Estimated filtered row counts for admin list pagination
-- ============================================================
-- Returns the PostgreSQL planner's estimated row count for a filtered query
-- WITHOUT scanning rows. It runs `EXPLAIN (FORMAT JSON) SELECT 1 FROM <table> WHERE <filters>`
-- and extracts the root plan node's `Plan Rows` estimate.
--
-- Why this exists (see design.md "Estimated counts" / Data Models):
--   PostgREST `count: 'estimated'` reflects whole-table planner statistics and ignores the
--   list's WHERE filters. This function gives a FILTER-AWARE estimate that is cheap (no row
--   scan) so list pagination stays fast at 10k+ rows. Exact counts are reserved for monetary
--   totals (handled separately in the application).
--
-- Security:
--   * SECURITY INVOKER  -> runs under the CALLER's role, so RLS policies are applied to the
--     planned query just like a normal read. An unauthorized caller only "sees" (estimates)
--     the rows their RLS policy permits.
--   * Table name is restricted to a fixed ALLOWLIST (no arbitrary table can be named).
--   * The dynamic SQL is built exclusively with format():
--       - identifiers (table + columns) via %I  (safe identifier quoting)
--       - literal values                via %L  (safe literal quoting)
--       - operators are mapped through a fixed CASE (never interpolated from input)
--     so the predicate cannot be used for SQL injection.
--   * EXPLAIN (without ANALYZE) does not execute the query -> no row scan, no side effects.
--
-- ------------------------------------------------------------------------------------------
-- CALLING CONVENTION (task 8.2 lib/db/estimated-count.ts must match this exactly)
-- ------------------------------------------------------------------------------------------
--   await client.rpc('estimate_filtered_count', {
--     p_table: 'profiles',                                  -- one of the allowlisted tables
--     p_filters: [                                          -- JSON array, combined with AND
--       { column: 'approval_status', op: 'eq',      value: 'approved' },
--       { column: 'is_paid_member',  op: 'is_true' },                    -- value omitted
--       { column: 'full_name',       op: 'ilike',   value: '%john%' },
--     ],
--   });
--
--   * p_table  : 'profiles' | 'payments' | 'events' | 'announcements' | 'forum_threads'
--   * p_filters: jsonb array (default '[]' = whole-table estimate). Each element:
--                { "column": <text>, "op": <op>, "value": <text> }
--   * Supported ops:
--       eq, neq, lt, lte, gt, gte, ilike            (require "value")
--       is_true, is_false, is_null, is_not_null     (no "value")
--   * Returns: bigint planner estimate (>= 0).
--   * On a contract violation (disallowed table / unknown op / missing column) the function
--     RAISEs, surfacing as an RPC error. Task 8.2 MUST catch any RPC error / null result and
--     fall back to an exact `count: 'exact'` query so pagination still renders (Req 5.6).
-- ============================================================

CREATE OR REPLACE FUNCTION public.estimate_filtered_count(
  p_table   text,
  p_filters jsonb DEFAULT '[]'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed_tables text[] := ARRAY['profiles', 'payments', 'events', 'announcements', 'forum_threads'];
  v_filter     jsonb;
  v_col        text;
  v_op         text;
  v_val        text;
  v_pred       text;
  v_predicates text[] := ARRAY[]::text[];
  v_where      text := '';
  v_sql        text;
  v_plan       json;
  v_rows       bigint;
BEGIN
  -- 1. Guard the table name against a fixed allowlist (primary injection defense).
  IF p_table IS NULL OR NOT (p_table = ANY (v_allowed_tables)) THEN
    RAISE EXCEPTION 'estimate_filtered_count: table % is not allowed', p_table
      USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Build the WHERE predicate safely from the structured filters (combined with AND).
  IF p_filters IS NOT NULL AND jsonb_typeof(p_filters) = 'array' THEN
    FOR v_filter IN SELECT value FROM jsonb_array_elements(p_filters) AS value
    LOOP
      v_col := v_filter ->> 'column';
      v_op  := lower(coalesce(v_filter ->> 'op', 'eq'));
      v_val := v_filter ->> 'value';

      IF v_col IS NULL OR length(v_col) = 0 THEN
        RAISE EXCEPTION 'estimate_filtered_count: filter is missing a column';
      END IF;

      -- Operators are mapped through a fixed CASE; identifiers use %I, values use %L.
      v_pred := CASE v_op
        WHEN 'eq'          THEN format('%I = %L',     v_col, v_val)
        WHEN 'neq'         THEN format('%I <> %L',    v_col, v_val)
        WHEN 'lt'          THEN format('%I < %L',     v_col, v_val)
        WHEN 'lte'         THEN format('%I <= %L',    v_col, v_val)
        WHEN 'gt'          THEN format('%I > %L',     v_col, v_val)
        WHEN 'gte'         THEN format('%I >= %L',    v_col, v_val)
        WHEN 'ilike'       THEN format('%I ILIKE %L', v_col, v_val)
        WHEN 'is_true'     THEN format('%I IS TRUE',     v_col)
        WHEN 'is_false'    THEN format('%I IS FALSE',    v_col)
        WHEN 'is_null'     THEN format('%I IS NULL',     v_col)
        WHEN 'is_not_null' THEN format('%I IS NOT NULL', v_col)
        ELSE NULL
      END;

      IF v_pred IS NULL THEN
        RAISE EXCEPTION 'estimate_filtered_count: unsupported op %', v_op
          USING ERRCODE = 'check_violation';
      END IF;

      v_predicates := array_append(v_predicates, v_pred);
    END LOOP;
  END IF;

  IF array_length(v_predicates, 1) > 0 THEN
    v_where := ' WHERE ' || array_to_string(v_predicates, ' AND ');
  END IF;

  -- 3. Ask the planner for the estimate. EXPLAIN (no ANALYZE) does not scan rows.
  v_sql := format('EXPLAIN (FORMAT JSON) SELECT 1 FROM public.%I', p_table) || v_where;
  EXECUTE v_sql INTO v_plan;

  -- 4. The root plan node's "Plan Rows" is the overall estimated row count.
  v_rows := (v_plan -> 0 -> 'Plan' ->> 'Plan Rows')::bigint;

  RETURN GREATEST(v_rows, 0);
END;
$$;

COMMENT ON FUNCTION public.estimate_filtered_count(text, jsonb) IS
  'Filter-aware planner row-count estimate via EXPLAIN (FORMAT JSON); SECURITY INVOKER so RLS applies. '
  'Args: p_table (allowlisted) + p_filters jsonb array of {column, op, value} ANDed together. '
  'Returns bigint estimate; callers must fall back to an exact count on error/null (see design.md, Req 5.6).';

-- Callable by both auth modes used by the admin portal:
--   * authenticated -> RLS-scoped client (RLS still applies under SECURITY INVOKER)
--   * service_role  -> local-admin client
GRANT EXECUTE ON FUNCTION public.estimate_filtered_count(text, jsonb) TO authenticated, service_role;
