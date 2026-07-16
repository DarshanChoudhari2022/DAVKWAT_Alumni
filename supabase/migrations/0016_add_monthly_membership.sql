-- Add monthly membership plans while preserving legacy lifetime records.
ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'monthly';

INSERT INTO membership_plans (name, description, amount, membership_type, duration_months, is_active)
VALUES
  ('Monthly Membership', 'Monthly membership with full portal access', 100.00, 'monthly', 1, true)
ON CONFLICT DO NOTHING;

-- Paid alumni plans should be annual/monthly going forward; faculty may still
-- carry lifetime membership on the profile as complimentary lifetime access.
UPDATE membership_plans
SET is_active = false
WHERE membership_type = 'lifetime';
