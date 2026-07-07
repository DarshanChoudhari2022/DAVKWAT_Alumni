-- ============================================================
-- Create a fresh admin profile for the DAVKAWT Alumni Portal
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- STEP 1: Create an auth user
-- Replace the email and password below with your desired admin credentials.
-- The password must be at least 6 characters.

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'davkawt.admin@gmail.com',                          -- ← Change to your admin email
  crypt('Admin@123456', gen_salt('bf')),         -- ← Change to your desired password
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "DAVKAWT Admin"}',
  'authenticated',
  'authenticated'
)
RETURNING id;

-- STEP 2: Create the profile
-- Copy the UUID returned from Step 1 and paste it below.
-- If running both statements together, use the subquery version below instead.

INSERT INTO public.profiles (
  id,
  full_name,
  email,
  batch_year,
  course,
  role,
  approval_status,
  approved_at,
  is_active,
  created_at,
  updated_at
)
SELECT
  id,
  'DAVKAWT Admin',                              -- ← Change display name if needed
  'davkawt.admin@gmail.com',                          -- ← Must match the email above
  2000,                                         -- ← Set a batch year (required field)
  'Admin',                                      -- ← Set a course (required field)
  'super_admin'::user_role,
  'approved'::approval_status,
  NOW(),
  true,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'davkawt.admin@gmail.com'               -- ← Must match the email above
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================
-- STEP 3: Get the profile ID for your ADMIN_PROFILE_ID env var
-- ============================================================

SELECT id, full_name, email, role, approval_status
FROM public.profiles
WHERE email = 'davkawt.admin@gmail.com'               -- ← Must match the email above
  AND role = 'super_admin';

-- ============================================================
-- DONE! Now set this env variable in Vercel:
--
--   ADMIN_PROFILE_ID=<the UUID from the query above>
--
-- Then redeploy your app.
-- ============================================================
