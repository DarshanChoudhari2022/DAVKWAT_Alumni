-- Keep 'other' in the constraint for backward compatibility with existing rows
-- but new registrations will no longer offer it as an option.
-- No schema change needed — the constraint already permits NULL and the three active values.
-- This migration is a no-op placeholder documenting the decision.

-- Update any existing 'other' education_level rows to 'left_before_10th'
-- since the UI no longer offers 'other' as a choice.
UPDATE public.profiles
SET education_level = 'left_before_10th'
WHERE education_level = 'other';
