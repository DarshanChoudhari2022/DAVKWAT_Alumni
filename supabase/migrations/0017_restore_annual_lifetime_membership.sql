-- Restore the public paid membership catalog to Annual and Lifetime only.
-- The monthly enum value may exist in databases that already ran 0016, but the
-- application no longer offers or validates monthly plans.
INSERT INTO membership_plans (name, description, amount, membership_type, duration_months, is_active)
VALUES
  ('Lifetime Membership', 'Lifetime membership with full portal access', 5000.00, 'lifetime', NULL, true)
ON CONFLICT DO NOTHING;

UPDATE membership_plans
SET is_active = true
WHERE membership_type IN ('annual', 'lifetime');

UPDATE membership_plans
SET is_active = false
WHERE membership_type::text = 'monthly';
