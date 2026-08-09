-- Keep report aggregation inside Postgres so the application does not download
-- and retain every matching profile/payment row in server memory.
CREATE OR REPLACE FUNCTION public.get_admin_report_charts(p_since timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'batchData', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('year', batch_year::text, 'count', total)
        ORDER BY batch_year
      )
      FROM (
        SELECT batch_year, count(*)::bigint AS total
        FROM profiles
        WHERE approval_status = 'approved'
        GROUP BY batch_year
        ORDER BY batch_year DESC
        LIMIT 20
      ) AS recent_batches
    ), '[]'::jsonb),
    'stateData', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('state', state_name, 'count', total)
        ORDER BY total DESC, state_name
      )
      FROM (
        SELECT COALESCE(current_state, 'Unknown') AS state_name, count(*)::bigint AS total
        FROM profiles
        WHERE approval_status = 'approved'
        GROUP BY COALESCE(current_state, 'Unknown')
        ORDER BY total DESC, state_name
        LIMIT 10
      ) AS top_states
    ), '[]'::jsonb),
    'registrationData', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('month', month_key, 'count', total)
        ORDER BY month_key
      )
      FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month_key,
               count(*)::bigint AS total
        FROM profiles
        WHERE created_at >= p_since
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) AS registrations
    ), '[]'::jsonb),
    'paymentData', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('month', month_key, 'amount', total)
        ORDER BY month_key
      )
      FROM (
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month_key,
               sum(amount)::numeric AS total
        FROM payments
        WHERE status = 'success' AND created_at >= p_since
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at)
      ) AS revenue
    ), '[]'::jsonb)
  );
$$;

COMMENT ON FUNCTION public.get_admin_report_charts(timestamptz) IS
  'Aggregates admin report charts in Postgres to avoid raw-row transfer and client memory growth.';

GRANT EXECUTE ON FUNCTION public.get_admin_report_charts(timestamptz)
  TO authenticated, service_role;
