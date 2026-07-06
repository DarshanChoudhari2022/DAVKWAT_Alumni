-- Add passing_year_10th column to profiles table for Higher Secondary alumni.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS passing_year_10th integer;

-- Update membership plan amounts
UPDATE public.membership_plans
  SET amount = 5000.00
  WHERE membership_type = 'lifetime';

UPDATE public.membership_plans
  SET amount = 500.00
  WHERE membership_type = 'annual';
