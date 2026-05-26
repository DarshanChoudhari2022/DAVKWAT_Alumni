# DAVKAWT Alumni Portal — Full PRD & Implementation Prompt
### For Windsurf / Claude Opus 4.7 (Production-Ready Build)

---

## CONTEXT & MISSION

You are building the **DAVKAWT Alumni Portal** — a full-stack, production-ready web application for **DAV Khagaul Alumni Welfare Trust (DAVKAWT)**. This is not a prototype. Every line of code must be production-grade, secure, performant, and maintainable by a future engineer who wasn't in this conversation.

The client is a registered Indian educational trust (Bihar) whose alumni are spread across India and abroad. The portal is their primary digital presence — it must feel professional, trustworthy, and modern while being fast on 4G mobile networks.

---

## TECH STACK (NON-NEGOTIABLE)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, TypeScript strict mode) |
| UI | Tailwind CSS v4 + shadcn/ui components |
| Database & Auth | Supabase (PostgreSQL + Row-Level Security + Auth) |
| File Storage | Supabase Storage |
| Email | Resend (transactional) |
| Payments | Easebuzz Payment Gateway |
| Hosting | Vercel (frontend) + Supabase Cloud (database, Indian region) |
| Monitoring | Sentry (errors) + Vercel Analytics |
| CI/CD | GitHub Actions → Vercel auto-deploy |
| State Management | Zustand (client state) + React Query / TanStack Query (server state) |
| Forms | React Hook Form + Zod validation |
| Rich Text | TipTap editor (announcements, forum posts) |
| Email Templates | React Email |

---

## DESIGN SYSTEM & AESTHETIC

### Brand Direction
- **Tone**: Refined institutional — think IIT alumni portals, not startup SaaS. Dignified, trustworthy, modern Indian professional.
- **Primary Color**: Deep Navy `#0F2557` (institutional authority)
- **Accent**: Saffron/Amber `#F59E0B` (Indian identity, warmth)
- **Secondary**: Slate Grey `#475569`
- **Background**: Off-white `#F8FAFC` (not pure white — easier on mobile screens)
- **Success/Approved**: Emerald `#10B981`
- **Warning/Pending**: Amber `#F59E0B`
- **Error/Rejected**: Rose `#F43F5E`

### Typography
- **Display / Headings**: `Playfair Display` (serif, editorial authority — Google Fonts)
- **Body / UI**: `DM Sans` (geometric, clean, excellent at small sizes)
- **Mono (code/IDs)**: `JetBrains Mono`

### Design Principles
1. **Mobile-first, always** — Design every screen at 375px first, then scale up
2. **Generous white space** — Alumni data can be dense; breathe space around it
3. **Card-based layouts** — Alumni profiles, events, announcements as clean cards
4. **Subtle depth** — Use `box-shadow` and slight border radiuses (`rounded-xl`) consistently
5. **No gradients everywhere** — Gradients only on hero sections and CTAs
6. **Micro-interactions** — Hover states, focus rings, loading skeletons on every data fetch

### Component Standards (Tailwind)
```
Cards: bg-white rounded-xl shadow-sm border border-slate-100 p-6
Buttons Primary: bg-[#0F2557] hover:bg-[#1a3a7a] text-white font-medium px-6 py-2.5 rounded-lg transition-colors
Buttons Accent: bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2.5 rounded-lg
Input Fields: border border-slate-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#0F2557] focus:border-transparent
Badge Verified: bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-full
Badge Pending: bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full
```

---

## PROJECT STRUCTURE

```
davkawt-portal/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public routes (no auth required)
│   │   ├── page.tsx              # Landing / Home
│   │   ├── about/page.tsx
│   │   ├── register/page.tsx
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── verify-email/page.tsx
│   ├── (alumni)/                 # Verified alumni routes
│   │   ├── layout.tsx            # Alumni shell layout
│   │   ├── dashboard/page.tsx
│   │   ├── directory/page.tsx
│   │   ├── directory/[id]/page.tsx
│   │   ├── profile/page.tsx      # Own profile edit
│   │   ├── announcements/page.tsx
│   │   ├── announcements/[id]/page.tsx
│   │   ├── events/page.tsx
│   │   ├── events/[id]/page.tsx
│   │   ├── forum/page.tsx
│   │   ├── forum/[categoryId]/page.tsx
│   │   ├── forum/[categoryId]/[threadId]/page.tsx
│   │   └── membership/page.tsx
│   ├── (admin)/                  # Admin routes
│   │   ├── layout.tsx            # Admin shell layout
│   │   ├── admin/page.tsx        # Admin dashboard home
│   │   ├── admin/approvals/page.tsx
│   │   ├── admin/alumni/page.tsx
│   │   ├── admin/alumni/[id]/page.tsx
│   │   ├── admin/announcements/page.tsx
│   │   ├── admin/events/page.tsx
│   │   ├── admin/forum/page.tsx
│   │   ├── admin/payments/page.tsx
│   │   ├── admin/reports/page.tsx
│   │   └── admin/settings/page.tsx
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/   # (if using NextAuth) or Supabase callbacks
│   │   ├── payments/
│   │   │   ├── initiate/route.ts
│   │   │   ├── webhook/route.ts  # Easebuzz payment callback
│   │   │   └── verify/route.ts
│   │   ├── admin/
│   │   │   ├── approve/route.ts
│   │   │   ├── reject/route.ts
│   │   │   └── export/route.ts
│   │   └── email/
│   │       └── send/route.ts
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── alumni/
│   │   ├── AlumniCard.tsx
│   │   ├── AlumniDirectoryFilters.tsx
│   │   ├── AlumniProfileForm.tsx
│   │   └── AlumniAvatar.tsx
│   ├── admin/
│   │   ├── ApprovalQueue.tsx
│   │   ├── StatsCard.tsx
│   │   ├── DataTable.tsx
│   │   └── PaymentRecords.tsx
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── AlumniSidebar.tsx
│   │   └── AdminSidebar.tsx
│   ├── forum/
│   ├── events/
│   └── shared/
│       ├── LoadingSkeleton.tsx
│       ├── EmptyState.tsx
│       ├── ConfirmDialog.tsx
│       └── PageHeader.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (cookies)
│   │   └── admin.ts              # Service role client (server-only)
│   ├── easebuzz/
│   │   ├── initiate.ts
│   │   └── verify.ts
│   ├── resend/
│   │   ├── client.ts
│   │   └── templates/
│   │       ├── WelcomeEmail.tsx
│   │       ├── ApprovalEmail.tsx
│   │       ├── RejectionEmail.tsx
│   │       ├── PaymentReceiptEmail.tsx
│   │       ├── EventReminderEmail.tsx
│   │       └── MembershipRenewalEmail.tsx
│   ├── validations/
│   │   ├── registration.ts
│   │   ├── profile.ts
│   │   └── admin.ts
│   └── utils/
│       ├── cn.ts                 # clsx + tailwind-merge
│       ├── format.ts             # Date, currency formatters
│       └── export.ts             # CSV/Excel export utilities
├── hooks/
│   ├── useAlumni.ts
│   ├── useAuth.ts
│   ├── useAdmin.ts
│   └── usePayment.ts
├── types/
│   ├── database.ts               # Generated Supabase types
│   ├── alumni.ts
│   ├── payments.ts
│   └── admin.ts
├── emails/                       # React Email templates
├── middleware.ts                 # Auth + role-based route protection
├── supabase/
│   ├── migrations/               # SQL migration files
│   └── seed.sql
└── .env.local.example
```

---

## DATABASE SCHEMA (Supabase / PostgreSQL)

### Implementation Note
Enable **Row Level Security (RLS)** on ALL tables from the start. Never skip this.

```sql
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('guest', 'pending', 'alumni', 'admin', 'super_admin');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE membership_type AS ENUM ('lifetime', 'annual');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal
  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,

  -- Academic (DAV Khagaul specific)
  batch_year INTEGER NOT NULL, -- graduation year
  course TEXT NOT NULL,        -- e.g. "Science", "Commerce", "Arts"
  roll_number TEXT,

  -- Contact (some optional with privacy controls)
  email TEXT NOT NULL,
  phone TEXT,
  alternate_phone TEXT,

  -- Location
  current_city TEXT,
  current_state TEXT,
  current_country TEXT DEFAULT 'India',
  pincode TEXT,

  -- Professional
  occupation TEXT,
  company TEXT,
  job_title TEXT,
  industry TEXT,
  linkedin_url TEXT,
  website_url TEXT,

  -- Bio
  bio TEXT,
  achievements TEXT,

  -- Privacy controls
  hide_email BOOLEAN DEFAULT false,
  hide_phone BOOLEAN DEFAULT false,

  -- Role & Status
  role user_role DEFAULT 'pending',
  approval_status approval_status DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,

  -- Membership
  membership_type membership_type,
  membership_expires_at DATE,
  is_paid_member BOOLEAN DEFAULT false,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL, -- Rich HTML from TipTap
  cover_image_url TEXT,
  author_id UUID NOT NULL REFERENCES profiles(id),
  is_pinned BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  banner_image_url TEXT,
  event_type TEXT DEFAULT 'in_person', -- 'in_person', 'online', 'hybrid'
  venue TEXT,
  online_link TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  max_attendees INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, alumni_id)
);

-- ============================================================
-- FORUM
-- ============================================================
CREATE TABLE forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  membership_type membership_type NOT NULL,
  duration_months INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id UUID NOT NULL REFERENCES profiles(id),
  plan_id UUID REFERENCES membership_plans(id),

  txnid TEXT UNIQUE NOT NULL,
  easebuzz_payment_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status payment_status DEFAULT 'pending',

  payment_mode TEXT,
  bank_ref_num TEXT,
  gateway_response JSONB,

  receipt_url TEXT,
  receipt_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SITE SETTINGS
-- ============================================================
CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_approval_status ON profiles(approval_status);
CREATE INDEX idx_profiles_batch_year ON profiles(batch_year);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_payments_alumni_id ON payments(alumni_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_forum_threads_category_id ON forum_threads(category_id);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);

CREATE INDEX idx_profiles_fts ON profiles USING GIN(
  to_tsvector('english',
    coalesce(full_name, '') || ' ' ||
    coalesce(company, '') || ' ' ||
    coalesce(occupation, '') || ' ' ||
    coalesce(current_city, '') || ' ' ||
    coalesce(batch_year::text, '')
  )
);
```

---

## ROW LEVEL SECURITY POLICIES

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by verified alumni" ON profiles
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('alumni', 'admin', 'super_admin'))
    AND approval_status = 'approved' AND is_active = true
  );

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins have full access" ON profiles
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
  );

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified alumni read published announcements" ON announcements
  FOR SELECT USING (
    is_published = true AND
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('alumni', 'admin', 'super_admin'))
  );

CREATE POLICY "Admins manage announcements" ON announcements
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
  );

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumni view own payments" ON payments
  FOR SELECT USING (auth.uid() = alumni_id);

CREATE POLICY "Admins view all payments" ON payments
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
  );
-- Apply similar patterns to events, forum tables, etc.
```

---

## MIDDLEWARE — ROUTE PROTECTION

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/about', '/register', '/login', '/forgot-password', '/verify-email'];
const ALUMNI_ROUTES = ['/dashboard', '/directory', '/profile', '/announcements', '/events', '/forum', '/membership'];
const ADMIN_ROUTES = ['/admin'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const pathname = req.nextUrl.pathname;

  if (!session && (ALUMNI_ROUTES.some(r => pathname.startsWith(r)) || ADMIN_ROUTES.some(r => pathname.startsWith(r)))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approval_status')
      .eq('id', session.user.id)
      .single();

    if (profile?.approval_status !== 'approved' && ALUMNI_ROUTES.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/pending-approval', req.url));
    }

    if (!['admin', 'super_admin'].includes(profile?.role || '') && ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
};
```

---

## PAGE-BY-PAGE SPECIFICATIONS

### PAGE 1: Public Home / Landing (`/`)

**Sections** (in order):
1. **Hero** — Full-width. Logo + "Connecting DAV Khagaul Alumni Across the World". CTA: "Join Now" + "Already a Member? Login". Background: Deep navy with subtle geometric pattern. Counter: "50+ Batches | 10,000+ Alumni | 20+ Countries"
2. **About the Trust** — 2-column: Text + image
3. **What You Get** — 3-column feature cards
4. **Upcoming Events Preview** — horizontal scroll, SSR fetched
5. **Recent Announcements** — 2-3 latest pinned
6. **How It Works** — Register → Approve → Connect
7. **Testimonial / Quote**
8. **Footer** — Logo, contact, social, privacy, terms

Fully SSR; events/announcements via `unstable_cache`; `useInView` for stat animation.

### PAGE 2: Registration (`/register`)

Multi-step form, 4 steps with progress bar.

**Step 1 — Account Setup**: Email (debounced duplicate check), Password (strength meter), Confirm. Sends OTP via Resend.
**Step 2 — Academic**: Full Name, Batch Year (1960–2024), Course, Roll Number.
**Step 3 — Personal & Contact**: Phone (+91), City, State, Country, DOB (optional), Gender (optional).
**Step 4 — Professional**: Occupation, Company, Industry, LinkedIn, Bio (≤500 chars), Profile photo (resize 400×400), Privacy toggles, Terms.

On Submit: create `auth.users` + `profiles` (role=pending), email user, email admin, redirect to `/pending-approval`. Zod validation client + server.

### PAGE 3: Login (`/login`)
Email + password, Forgot link, Google OAuth optional. Rate limit 5 fails → 15-min lockout.

### PAGE 4: Pending Approval (`/pending-approval`)
Status card, read-only details (with edit option), contact info.

### PAGE 5: Alumni Dashboard (`/dashboard`)
Sidebar/Bottom-nav layout. Welcome card with completion %, membership badge. Quick stats. Recent announcements (3), Upcoming events (2), Forum activity (3), Profile-completion nudge if <80%, Membership banner if not paid.

### PAGE 6: Alumni Directory (`/directory`)
Filters: search, batch range, course, city, state, country, industry, membership.
Grid: 12/page, cards (avatar, name, batch, course, city, company), list-view toggle. Server-side filtering via FTS index, URL search params, skeleton loaders, empty state.

### PAGE 7: Alumni Profile (`/directory/[id]`)
Header (avatar, name, batch+course badge, city, membership). Contact (privacy-aware). Professional. Academic. Bio. Achievements. Joined date. Self: "Edit". Admin: "Deactivate", role dropdown.

### PAGE 8: Edit Profile (`/profile`)
Same fields as Steps 2-4. `react-image-crop`. Privacy toggles. Optimistic save + toast.

### PAGE 9: Announcements (`/announcements`)
Pinned (amber border) at top. Cards: cover image, title, date, preview.

### PAGE 10: Single Announcement (`/announcements/[id]`)
Cover image, title, date, author, sanitized HTML, back button.

### PAGE 11: Events (`/events`)
Tabs: Upcoming | Past. Card: banner, title, datetime, venue/online, RSVP count.
Single (`/events/[id]`): full details, RSVP toggle, attendees count, .ics download, online link visible to RSVPed only.

### PAGE 12: Forum (`/forum`)
Categories list. `/forum/[categoryId]`: New Thread (modal + TipTap), threads list with pinned at top. `/forum/[categoryId]/[threadId]`: original post + replies, reply box (TipTap, 2000 char), admin pin/lock/delete.

### PAGE 13: Membership (`/membership`)
If not paid: plans display + "Pay with Easebuzz".

```typescript
// lib/easebuzz/initiate.ts
// 1. txnid via nanoid
// 2. Insert payment row 'pending'
// 3. Hash: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
// 4. Return form payload
// 5. On return URL → verify hash → update payment + profile
```

Webhook (`/api/payments/webhook`): verify hash, update payments + profile (`is_paid_member`, `membership_expires_at`), send PDF receipt, audit log.

If paid: details, expiry, receipt download, renewal prompt 30 days before expiry.

### PAGE 14: Admin Dashboard (`/admin`)
Sidebar: Dashboard, Approvals (badge), Alumni, Announcements, Events, Forum, Payments, Reports, Settings.
Home: Stat cards (Total | Pending | Paid | Revenue), Recharts (registrations line, batch bar, payment pie), activity feed.

### PAGE 15: Pending Approvals (`/admin/approvals`)
Table with bulk select. Approve (green) / Reject (red, reason modal). Sends email, updates role. Filters: All | Today | This Week | Older.

### PAGE 16: Alumni Management (`/admin/alumni`)
Searchable filterable table. Actions: View, Edit, Deactivate, Change Role. CSV/Excel export honoring active filters.

### PAGE 17: Admin Announcements (`/admin/announcements`)
List + New (TipTap, cover, pin, schedule). Edit/Delete/Publish/Unpublish.

### PAGE 18: Admin Events (`/admin/events`)
List + New. RSVPs view + export. "Send reminder" to RSVPed.

### PAGE 19: Admin Payments (`/admin/payments`)
Table with filters. Refund link. CSV export.

### PAGE 20: Reports & Exports (`/admin/reports`)
Export cards (Alumni, Payments, Event RSVPs). Charts: registrations over time, by state/country, batch distribution, conversion rate.

### PAGE 21: Admin Settings (`/admin/settings`)
Membership plans CRUD, email template preview, site settings, admin user management (super_admin only).

---

## EMAIL TEMPLATES (React Email)

Branded (navy/saffron), mobile-responsive, plain-text fallback.

1. **Registration Received** — pending review, 2-3 day SLA.
2. **Approval** — congrats + login link + batch peer count.
3. **Rejection** — reason + contact email.
4. **Payment Receipt** — txnid, amount, plan, PDF attached.
5. **Event Reminder** — 24h before, datetime, venue, online link.
6. **Membership Renewal Reminder** — 30 days before expiry, renew CTA.

---

## API ROUTES SPECIFICATION

### POST `/api/payments/initiate`
Validate session vs alumniId. Fetch plan. `txnid = DAVKAWT-${Date.now()}-${nanoid(6)}`. Insert pending payment. Compute hash. Return `{ txnid, hash, key, amount, productinfo, firstname, email, surl, furl, udf1 }`.

### POST `/api/payments/webhook`
Parse x-www-form-urlencoded. Reverse-hash verify: `sha512(salt|status||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)`. Update payments + profile on success. Send receipt. Audit log. Return 200.

### POST `/api/admin/approve`
Body: `{ alumniId }`. Admin session required. Update profile (approved, role=alumni, approved_by/at). Email. Audit log.

### GET `/api/admin/export`
Query: `{ type, eventId?, startDate?, endDate?, format }`. Admin session. Stream CSV/XLSX with `Content-Disposition`.

---

## ENVIRONMENT VARIABLES

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Easebuzz
EASEBUZZ_KEY=
EASEBUZZ_SALT=
EASEBUZZ_ENV=test
NEXT_PUBLIC_EASEBUZZ_PAY_URL=https://pay.easebuzz.in/pay/initiateLink

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@davkawt.org

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TRUST_NAME=DAV Khagaul Alumni Welfare Trust

ADMIN_NOTIFICATION_EMAIL=admin@davkawt.org
SENTRY_DSN=
```

---

## SECURITY CHECKLIST

- [ ] Server-side session validation on all API routes
- [ ] Admin role re-checked from DB, not just cookie
- [ ] Easebuzz webhook hash verified before any DB mutation
- [ ] Zod validation on both client and server
- [ ] File uploads: server MIME validation, ≤5MB, Storage rules
- [ ] Rate limit: auth endpoints, registration, OTP resend (Upstash Redis)
- [ ] CORS locked to your domain
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `EASEBUZZ_SALT` server-only
- [ ] Parameterized queries only (no string interpolation)
- [ ] DOMPurify on all TipTap output (store + render)
- [ ] Same-site cookies (Supabase default)
- [ ] Min 8-char password (Supabase bcrypt)
- [ ] RLS on every table with explicit policies
- [ ] Admin actions audit-logged
- [ ] HTTPS only (Vercel)

---

## PERFORMANCE REQUIREMENTS

- LCP < 2.5s on 4G mobile
- INP < 100ms
- CLS < 0.1
- `next/image` everywhere; lazy on below-fold avatars
- Pagination (directory 20, admin tables 10)
- Never `SELECT *`
- Edge caching for public pages
- React Suspense + streaming on dashboard
- Skeletons on every async section

---

## ACCESSIBILITY (WCAG 2.1 AA)

- Labels on every input; `aria-describedby` for errors
- Focus-visible always (style, never remove)
- Contrast ≥ 4.5:1
- Alt text on meaningful images
- Keyboard nav for sidebar/modals/dropdowns
- `aria-live` for toasts and dynamic errors
- Skip-to-main-content link

---

## MOBILE-FIRST UI PATTERNS

- Desktop: 240px sidebar + 56px header
- Mobile: bottom tab bar (Home, Directory, Forum, Events, Profile) + hamburger
- Directory: 1col mobile / 2col tablet / 3col desktop + sidebar filters
- Admin tables: horizontal scroll on mobile; approval queue uses card layout

---

## IMPLEMENTATION ORDER (8 Weeks)

### Week 1 — Foundation
GitHub repo + Next.js 15 strict TS. Tailwind v4 + shadcn/ui. Supabase (ap-south-1). Migrations + RLS. Vercel + env vars. Sentry. Design tokens. Layout (Navbar, Footer, Sidebar, Bottom-nav).

### Week 2 — Auth & Registration
Supabase Auth (email + Google OAuth). Multi-step registration with OTP. Middleware. Pending approval. Login/forgot password. Welcome email. Admin notification.

### Week 3 — Alumni Profiles & Directory
Profile creation/edit + photo upload. Directory with FTS + pagination. Profile page. Privacy controls.

### Week 4 — Community Features
Announcements CRUD + read. Events CRUD + RSVP + .ics. Forum (categories, threads, replies, moderation). TipTap + DOMPurify.

### Week 5 — Payments
Plans CRUD. Easebuzz initiate/verify/webhook. Receipt + email. Membership status. Renewal tracking + reminders.

### Week 6 — Admin Dashboard
Approvals queue (bulk). Alumni management. Payments table. Stats dashboard (Recharts). Audit log viewer. Site settings.

### Week 7 — Reports, Emails & Polish
CSV/Excel export. Analytics charts. All 6 React Email templates. Bulk email to segments. Mobile + a11y audit.

### Week 8 — QA, UAT & Launch
Cross-browser + mobile testing. Easebuzz E2E. Security review. Lighthouse ≥ 90. Admin user manual PDF. DNS + SSL. Launch + monitoring alerts.

---

## THIRD-PARTY ACCOUNTS NEEDED (Client to Provide)

1. Domain (e.g. davkawtalumni.org)
2. Easebuzz merchant account (Trust KYC — see SRS Appendix B)
3. Resend account (verify sending domain)
4. Supabase account (Pro for backups)
5. Vercel account (Pro for custom domain + logs)
6. Google OAuth credentials
7. Sentry account

---

## HANDOVER DELIVERABLES

1. GitHub repository (transferred to DAVKAWT org)
2. Live production deployment
3. Supabase project transferred to DAVKAWT account
4. Documented env vars (out-of-band)
5. Admin User Manual PDF (≥20 pages): approvals, announcements, events, forum, payments, reports, admin users
6. Technical README (setup, architecture, deploy guide)
7. 30-day post-launch support channel

---

## NOTES FOR WINDSURF / AI AGENT

1. TypeScript strict — no `any`.
2. Never `SELECT *` in Supabase queries — specify columns.
3. Server components by default; `'use client'` only when needed.
4. Error boundaries around every major section with friendly fallback.
5. Every async server component has a `loading.tsx` sibling with skeletons.
6. Toasts via `sonner`.
7. Mutations via Server Actions + `useTransition` for optimistic UI.
8. No localStorage for sensitive data — HttpOnly cookies via Supabase.
9. All images via `next/image`. Resize/compress profile photos on upload.
10. Pagination everywhere (directory 20, admin tables 10).
11. Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
12. Branches: `main` + `develop` + `feature/*` per week.
13. Easebuzz test mode throughout dev; switch to production only at final deploy.
14. DOMPurify on ALL TipTap output before store + render.
15. Same Zod schema for client validation AND server actions. DRY.

---

*End of PRD. This document defines the complete scope for the DAVKAWT Alumni Portal. Build to this specification. Every feature listed is required for the v1.0 launch.*
