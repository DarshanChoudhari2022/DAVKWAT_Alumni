# DAVKAWT Alumni Portal

Production-ready full-stack alumni portal for **DAV Khagaul Alumni Welfare Trust**.

## Stack
- Next.js 15 (App Router, TS strict) · Tailwind v4 · shadcn/ui
- Supabase (Postgres + Auth + Storage + RLS, ap-south-1)
- Easebuzz payments · Resend email · React Email
- Vercel hosting · Sentry · GitHub Actions

## Local Setup

```bash
pnpm install            # or npm / yarn
cp .env.local.example .env.local   # fill in values, including DATABASE_URL and DIRECT_URL for Prisma
pnpm dev
```

## Database
Run migrations in order from `supabase/migrations/` on your Supabase project (SQL editor or `supabase db push`). Then run `supabase/seed.sql` to insert default forum categories, membership plans, and site settings.

## Project Structure
Use `GETTING_STARTED.md` for local setup and `ADMIN_USER_MANUAL.md` for operational workflows.

## Conventions
- Server Components by default; `'use client'` only when needed.
- Zod schemas in `lib/validations/` are shared between client forms and server actions.
- Never `SELECT *` — list columns explicitly.
- All TipTap output sanitized with DOMPurify before store + render.
- Pagination defaults: directory 20/page, admin tables 10/page.

## Scripts
- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm typecheck` — TS check
- `pnpm db:types` — regenerate `types/database.ts` from Supabase
