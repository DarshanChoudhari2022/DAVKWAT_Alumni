-- Add structured applicant type, alumni education, and faculty teaching details.
-- Existing rows are backfilled as alumni using the legacy batch/course fields.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type text NOT NULL DEFAULT 'alumni',
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS education_stream text,
  ADD COLUMN IF NOT EXISTS passing_year integer,
  ADD COLUMN IF NOT EXISTS taught_subject text,
  ADD COLUMN IF NOT EXISTS taught_from_year integer,
  ADD COLUMN IF NOT EXISTS taught_to_year integer;

UPDATE public.profiles
SET
  profile_type = COALESCE(profile_type, 'alumni'),
  passing_year = COALESCE(passing_year, batch_year),
  education_level = COALESCE(
    education_level,
    CASE
      WHEN course IN ('Science', 'Commerce', 'Arts') THEN 'senior_secondary'
      WHEN course ILIKE '%secondary%' THEN 'secondary'
      ELSE 'other'
    END
  ),
  education_stream = COALESCE(
    education_stream,
    CASE WHEN course IN ('Science', 'Commerce', 'Arts') THEN course ELSE NULL END
  )
WHERE profile_type = 'alumni';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_type_check,
  ADD CONSTRAINT profiles_profile_type_check
    CHECK (profile_type IN ('alumni', 'faculty'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_education_level_check,
  ADD CONSTRAINT profiles_education_level_check
    CHECK (
      education_level IS NULL
      OR education_level IN ('left_before_10th', 'secondary', 'senior_secondary', 'other')
    );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_education_stream_check,
  ADD CONSTRAINT profiles_education_stream_check
    CHECK (
      education_stream IS NULL
      OR education_stream IN ('Science', 'Commerce', 'Arts')
    );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_faculty_year_range_check,
  ADD CONSTRAINT profiles_faculty_year_range_check
    CHECK (
      taught_to_year IS NULL
      OR taught_from_year IS NULL
      OR taught_to_year >= taught_from_year
    );

CREATE INDEX IF NOT EXISTS idx_profiles_profile_type
  ON public.profiles (profile_type);

CREATE INDEX IF NOT EXISTS idx_profiles_passing_year
  ON public.profiles (passing_year);
