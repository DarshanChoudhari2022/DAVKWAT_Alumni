-- Additive diagnostics only; preserves all payment history and existing plan IDs.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS verification_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_error TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

CREATE INDEX IF NOT EXISTS payments_easebuzz_recovery_idx
ON public.payments (verification_checked_at ASC NULLS FIRST, created_at ASC)
WHERE status IN ('pending', 'failed') AND gateway_response->>'provider' = 'easebuzz';

-- Reserve a check atomically so concurrent browser/admin requests cannot all
-- bypass the cooldown. This does not change the payment or membership status.
CREATE OR REPLACE FUNCTION public.claim_easebuzz_verification(p_txnid TEXT, p_member_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_claimed BOOLEAN;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
  END IF;
  UPDATE payments SET verification_checked_at = NOW()
  WHERE txnid = p_txnid AND status IN ('pending', 'failed')
    AND gateway_response->>'provider' = 'easebuzz'
    AND (p_member_id IS NULL OR alumni_id = p_member_id)
    AND (verification_checked_at IS NULL OR verification_checked_at < NOW() - INTERVAL '20 seconds')
  RETURNING TRUE INTO v_claimed;
  RETURN COALESCE(v_claimed, FALSE);
END;
$$;
REVOKE ALL ON FUNCTION public.claim_easebuzz_verification(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_easebuzz_verification(TEXT, UUID) TO service_role;
