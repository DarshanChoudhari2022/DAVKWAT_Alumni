# Getting Started - DAVKAWT Alumni Portal

This document walks you through getting the development environment up and running.

## 1. Prerequisites

- Node.js **20.x or 22.x** (LTS)
- pnpm 9+ (recommended) or npm 10+
- A Supabase account (free tier is fine for development)
- A Resend account (free tier - 3,000 emails/month)
- An Easebuzz **test mode** account (production credentials only at launch)

## 2. Install dependencies

```bash
cd davkawt-portal
pnpm install        # or: npm install
```

Expected: ~600 packages, < 90 seconds.

## 3. Set up Supabase

1. Create a project at <https://supabase.com> (region: **ap-south-1 / Mumbai**).
2. In **Project Settings -> API**, copy:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` -> `SUPABASE_SERVICE_ROLE_KEY` (server-only - never commit)
3. In **Project Settings -> Database**, copy the connection strings for:
   - `DATABASE_URL`
   - `DIRECT_URL`
4. Open the SQL editor and run, in order:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/seed.sql`
5. In **Auth -> URL Configuration**, add `http://localhost:3000/auth/callback` to "Redirect URLs".

## 4. Set up Resend

1. Sign up at <https://resend.com>.
2. Add and verify your sending domain (for example `davkawt.org`). For development only, you can use the default `onboarding@resend.dev`.
3. Copy your API key into `RESEND_API_KEY`.

## 5. Set up Easebuzz (test mode)

1. Sign up at <https://dashboard.easebuzz.in> (test environment is automatic).
2. Copy `Key` and `Salt` from **API Keys** into `EASEBUZZ_KEY` and `EASEBUZZ_SALT`.
3. Keep `EASEBUZZ_ENV=test` until you go live.

## 6. Environment variables

```bash
cp .env.local.example .env.local
# Fill in all the values from steps 3-5, including DATABASE_URL and DIRECT_URL
```

## 7. Run the dev server

```bash
pnpm dev
```

Open <http://localhost:3000> - you should see the landing page.

## 8. Create your first admin user

After registering an account through the UI, promote yourself to admin via the SQL editor:

```sql
UPDATE profiles
SET role = 'super_admin', approval_status = 'approved'
WHERE email = 'your-email@example.com';
```

## 9. Common commands

```bash
pnpm dev          # local dev
pnpm build        # production build
pnpm typecheck    # strict TS check
pnpm lint         # eslint
```

## 10. Troubleshooting

- **Cannot find module errors after install**: delete `.next/` and `node_modules/`, then reinstall.
- **RLS errors when querying**: confirm you ran `0002_rls.sql` and the helper functions (`is_admin`, `is_approved_alumni`) exist.
- **Emails not sending in dev**: Resend sandbox restricts recipients to your verified email. Use the default `onboarding@resend.dev` only for development.
- **Sign-up email confirmation loop**: in Supabase Auth settings, either disable "Confirm email" for development or use the link from the Resend log.
