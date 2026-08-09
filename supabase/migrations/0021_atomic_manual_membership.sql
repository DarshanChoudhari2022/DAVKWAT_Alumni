-- Keep manual payment review and the profile membership projection consistent.
-- This also repairs successful payments created before the atomic review function.

CREATE OR REPLACE FUNCTION public.review_manual_payment(
  p_payment_id UUID,
  p_status payment_status,
  p_reviewed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_plan_type membership_type;
  v_duration_months INTEGER;
  v_membership_type membership_type;
  v_expires_at DATE;
  v_reviewed_at TIMESTAMPTZ := NOW();
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND approval_status = 'approved'
      AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  SELECT p.*
    INTO v_payment
  FROM payments p
  WHERE p.id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT mp.membership_type,
         mp.duration_months
    INTO v_plan_type, v_duration_months
  FROM membership_plans mp
  WHERE mp.id = v_payment.plan_id;

  UPDATE payments
  SET status = p_status,
      updated_at = v_reviewed_at,
      gateway_response = COALESCE(gateway_response, '{}'::JSONB) || jsonb_build_object(
        'reviewed_by', COALESCE(auth.uid(), p_reviewed_by),
        'reviewed_at', v_reviewed_at,
        'review_source', 'admin_manual_review'
      )
  WHERE id = p_payment_id;

  IF p_status = 'success' THEN
    v_membership_type := COALESCE(
      v_plan_type,
      CASE WHEN v_payment.amount >= 5000 THEN 'lifetime'::membership_type
           ELSE 'annual'::membership_type END
    );

    IF v_membership_type = 'annual' THEN
      v_expires_at := (
        v_payment.created_at::DATE
        + make_interval(months => COALESCE(v_duration_months, 12))
      )::DATE;
    ELSE
      v_expires_at := NULL;
    END IF;

    UPDATE profiles
    SET is_paid_member = TRUE,
        membership_type = CASE
          WHEN membership_type = 'lifetime' THEN 'lifetime'::membership_type
          ELSE v_membership_type
        END,
        membership_expires_at = CASE
          WHEN membership_type = 'lifetime' OR v_membership_type = 'lifetime' THEN NULL
          ELSE v_expires_at
        END,
        updated_at = v_reviewed_at
    WHERE id = v_payment.alumni_id;
  END IF;

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'alumni_id', v_payment.alumni_id,
    'status', p_status,
    'membership_type', v_membership_type,
    'membership_expires_at', v_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_manual_payment(UUID, payment_status, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(UUID, payment_status, UUID)
  TO authenticated, service_role;

-- Repair profiles whose successful manual payment and membership projection drifted
-- apart. A lifetime payment always wins; otherwise the newest annual payment defines
-- the one-year period from its submission/payment-proof date.
WITH successful_payments AS (
  SELECT
    p.alumni_id,
    p.created_at::DATE AS starts_on,
    COALESCE(
      mp.membership_type,
      CASE WHEN p.amount >= 5000 THEN 'lifetime'::membership_type
           ELSE 'annual'::membership_type END
    ) AS resolved_type,
    COALESCE(mp.duration_months, 12) AS duration_months,
    ROW_NUMBER() OVER (
      PARTITION BY p.alumni_id
      ORDER BY
        CASE
          WHEN COALESCE(mp.membership_type::TEXT, CASE WHEN p.amount >= 5000 THEN 'lifetime' ELSE 'annual' END) = 'lifetime'
            THEN 0
          ELSE 1
        END,
        p.created_at DESC,
        p.id DESC
    ) AS priority
  FROM payments p
  LEFT JOIN membership_plans mp ON mp.id = p.plan_id
  WHERE p.status = 'success'
), memberships AS (
  SELECT
    alumni_id,
    resolved_type,
    CASE
      WHEN resolved_type = 'annual'
        THEN (starts_on + make_interval(months => duration_months))::DATE
      ELSE NULL
    END AS expires_on
  FROM successful_payments
  WHERE priority = 1
)
UPDATE profiles p
SET is_paid_member = TRUE,
    membership_type = CASE
      WHEN p.membership_type = 'lifetime' OR m.resolved_type = 'lifetime'
        THEN 'lifetime'::membership_type
      ELSE m.resolved_type
    END,
    membership_expires_at = CASE
      WHEN p.membership_type = 'lifetime' OR m.resolved_type = 'lifetime' THEN NULL
      ELSE m.expires_on
    END,
    updated_at = NOW()
FROM memberships m
WHERE p.id = m.alumni_id
  AND p.profile_type <> 'faculty';

UPDATE profiles
SET is_paid_member = FALSE,
    updated_at = NOW()
WHERE membership_type = 'annual'
  AND membership_expires_at < CURRENT_DATE
  AND is_paid_member = TRUE;
