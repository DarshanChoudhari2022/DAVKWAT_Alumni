-- Apply before enabling Easebuzz. Only server-side verified callbacks may call this.
CREATE OR REPLACE FUNCTION public.finalize_easebuzz_payment(
  p_txnid TEXT,
  p_status TEXT,
  p_response JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_type membership_type;
  v_expiry DATE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('success', 'failed', 'pending') THEN
    RAISE EXCEPTION 'Invalid payment status';
  END IF;
  SELECT * INTO v_payment FROM payments WHERE txnid = p_txnid FOR UPDATE;
  IF NOT FOUND OR v_payment.gateway_response->>'provider' IS DISTINCT FROM 'easebuzz' THEN
    RAISE EXCEPTION 'Easebuzz payment not found';
  END IF;
  IF v_payment.status IN ('success', 'refunded') THEN
    RETURN jsonb_build_object('duplicate', true, 'status', v_payment.status);
  END IF;
  IF (p_response->>'amount')::NUMERIC IS DISTINCT FROM v_payment.amount
     OR p_response->>'udf1' IS DISTINCT FROM v_payment.alumni_id::TEXT
     OR p_response->>'udf2' IS DISTINCT FROM v_payment.plan_id::TEXT THEN
    RAISE EXCEPTION 'Payment details do not match';
  END IF;
  v_type := (v_payment.gateway_response->'request'->>'udf3')::membership_type;
  IF NOT ((v_type = 'annual' AND v_payment.amount = 500) OR (v_type = 'lifetime' AND v_payment.amount = 5000)) THEN
    RAISE EXCEPTION 'Invalid membership amount';
  END IF;
  UPDATE payments SET
    status = p_status::payment_status,
    easebuzz_payment_id = COALESCE(p_response->>'easepayid', easebuzz_payment_id),
    payment_mode = COALESCE(p_response->>'PG_TYPE', p_response->>'payment_source', 'easebuzz'),
    bank_ref_num = p_response->>'bank_ref_num',
    gateway_response = gateway_response || jsonb_build_object('response', p_response),
    updated_at = NOW()
  WHERE id = v_payment.id;
  IF p_status = 'success' THEN
    SELECT * INTO v_profile FROM profiles WHERE id = v_payment.alumni_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
    IF v_profile.membership_type = 'lifetime' OR v_type = 'lifetime' THEN
      v_type := 'lifetime';
      v_expiry := NULL;
    ELSE
      v_expiry := (GREATEST(CURRENT_DATE, COALESCE(v_profile.membership_expires_at, CURRENT_DATE)) + INTERVAL '12 months')::DATE;
    END IF;
    -- Trust approval is independent of payment and is never changed here.
    UPDATE profiles SET is_paid_member = TRUE, membership_type = v_type,
      membership_expires_at = v_expiry, updated_at = NOW()
    WHERE id = v_payment.alumni_id;
  END IF;
  RETURN jsonb_build_object('duplicate', false, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_easebuzz_payment(TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_easebuzz_payment(TEXT, TEXT, JSONB) TO service_role;

-- Keep the existing plan IDs so past payments retain their foreign keys.
UPDATE membership_plans SET amount = 500, duration_months = 12
WHERE membership_type = 'annual';
UPDATE membership_plans SET amount = 5000, duration_months = NULL
WHERE membership_type = 'lifetime';
