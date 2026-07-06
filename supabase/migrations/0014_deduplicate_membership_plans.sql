-- Delete duplicate plans keeping only the first one (lowest ID or earliest created_at)
DELETE FROM public.membership_plans a
USING public.membership_plans b
WHERE a.id > b.id AND a.name = b.name AND a.membership_type = b.membership_type;

-- Add a unique constraint on the name field
ALTER TABLE public.membership_plans
  DROP CONSTRAINT IF EXISTS membership_plans_name_key,
  ADD CONSTRAINT membership_plans_name_key UNIQUE (name);
