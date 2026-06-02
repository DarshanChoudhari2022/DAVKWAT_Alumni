/**
 * Admin portal cache layer (design Section 4, "Cache layer").
 *
 * This module centralizes the Next.js `unstable_cache` wrappers used by the admin
 * portal to serve Reference_Data (membership plans, site settings) and portal-wide
 * Aggregate_Data (stat counts, the pending-approvals badge) without re-querying the
 * database on every navigation.
 *
 * Why `unstable_cache` (Req 4.3, 4.8): it provides stale-while-revalidate semantics
 * by default — within the `revalidate` window a cached value is served directly; on
 * the first read after the window elapses the *stale* value is returned to that
 * request while the value is refreshed in the background, and the refreshed value is
 * served to later reads. If a background refresh throws, `unstable_cache` keeps
 * serving the last successfully cached value rather than surfacing the error. The
 * route itself stays dynamic (we do NOT make whole segments static), so the auth gate
 * still runs on every request (Req 8.2).
 *
 * ─────────────────────────────────────────────────────────────────────────────────
 * IDENTITY-ISOLATION INVARIANT (Req 8.1, 8.3 — design "RLS / identity-isolation
 * safety analysis", Property 16):
 *
 *   Only PORTAL-GLOBAL, NON-IDENTITY-SCOPED values are ever cached here. Every value
 *   below is one that every authorized admin is equally entitled to see (reference
 *   data and portal-wide aggregates). No cache entry is keyed by, or contains, a
 *   specific administrator's identity, and `buildCacheKey` never folds an actor id or
 *   the auth `mode` ('local' | 'supabase') into the key. This makes it impossible for
 *   one administrator's value to be served to another. NEVER add an identity-scoped
 *   value (anything that differs per administrator) to this module.
 *
 * SERVICE-ROLE READ JUSTIFICATION:
 *
 *   `unstable_cache` callbacks run outside the request scope and therefore cannot read
 *   the request cookies that an RLS-scoped client needs. The portal-global reference
 *   reads and aggregate counts below therefore use the service-role admin client
 *   (`createAdminClient`) ONLY. This is safe under the design's RLS-equivalence
 *   precondition: for every authorized admin, the RLS-scoped read returns the SAME
 *   value as the service-role read for these portal-global values (an approved admin's
 *   RLS policy already permits reading all matching rows). The service-role client is
 *   therefore identical in result to an RLS-scoped read for an authorized admin, while
 *   the cooked value remains non-identity-scoped. Identity-scoped data must NEVER be
 *   read here.
 */

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicSiteSettings, type SiteSettings } from '@/lib/site-settings';

/**
 * Tag identifiers used for `revalidateTag`-based invalidation on writes
 * (design Section 4 invalidation table; consumed by `lib/cache/invalidate.ts`).
 */
export const CACHE_TAGS = {
  referenceMembershipPlans: 'ref:membership-plans',
  referenceSiteSettings: 'ref:site-settings',
  statPendingApprovals: 'stat:pending-approvals',
  statDashboard: 'stat:dashboard',
  statPayments: 'stat:payments',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/**
 * Revalidation windows in seconds. Bounded by Requirement 4:
 *  - `badge`     ≤ 60s  (Req 4.5: pending-approvals badge)
 *  - `stats`     ≤ 120s (Req 4.7: portal statistics other than the badge)
 *  - `reference` ≤ 300s (Req 4.6: reference data)
 */
export const REVALIDATE = {
  badge: 60,
  stats: 120,
  reference: 300,
} as const;

/** Classification of a cached value (design "Data Models — Cache descriptor"). */
export type CacheClass = 'reference' | 'aggregate-stat' | 'aggregate-badge';

/**
 * Descriptor binding a cached value's identity-independent key parts to its
 * invalidation tags, revalidation window, and class (design "Data Models").
 *
 * `keyParts` MUST be identity-independent: no actor id and no auth mode. This is the
 * structural guarantee behind Property 16 (cache keys are identity-independent).
 */
export interface CachedValueDescriptor {
  /** Identity-independent key parts (no actor id, no auth mode). */
  keyParts: string[];
  /** Tags for `revalidateTag` invalidation. */
  tags: CacheTag[];
  /** Revalidation window in seconds (badge ≤ 60, stat ≤ 120, reference ≤ 300). */
  revalidateSeconds: number;
  /** Value classification. */
  class: CacheClass;
}

/**
 * Deterministic, PURE cache-key builder (Property 16 — Req 8.3).
 *
 * The returned key is a function of the descriptor's `keyParts` ALONE. It takes no
 * administrator identity and no auth `mode` as input, so for any two distinct admins
 * (in either mode) the key for a given descriptor is identical and contains no
 * identity/mode component. Parts are normalized (trimmed) so equivalent descriptors
 * always produce byte-identical keys. The result is the `string[]` passed directly to
 * `unstable_cache` as its key parts.
 *
 * This function performs NO I/O and never reads request state — it is safe to call
 * anywhere and is the seam exercised by the Property 16 test.
 */
export function buildCacheKey(descriptor: CachedValueDescriptor): string[] {
  return descriptor.keyParts.map((part) => part.trim());
}

/**
 * Canonical descriptors for every cached value. Centralizing them keeps the
 * identity-independent key parts, tags, windows, and class in one auditable place and
 * lets tests (Property 16, the revalidate-window smoke assertions) read them directly.
 *
 * Every `keyParts` entry is portal-global — note the absence of any actor id or
 * auth-mode token.
 */
export const CACHE_DESCRIPTORS = {
  membershipPlans: {
    keyParts: ['admin', 'reference', 'membership-plans'],
    tags: [CACHE_TAGS.referenceMembershipPlans],
    revalidateSeconds: REVALIDATE.reference,
    class: 'reference',
  },
  membershipPlansDetailed: {
    keyParts: ['admin', 'reference', 'membership-plans-detailed'],
    tags: [CACHE_TAGS.referenceMembershipPlans],
    revalidateSeconds: REVALIDATE.reference,
    class: 'reference',
  },
  siteSettings: {
    keyParts: ['admin', 'reference', 'site-settings'],
    tags: [CACHE_TAGS.referenceSiteSettings],
    revalidateSeconds: REVALIDATE.reference,
    class: 'reference',
  },
  pendingApprovalsCount: {
    keyParts: ['admin', 'stat', 'pending-approvals-count'],
    tags: [CACHE_TAGS.statPendingApprovals],
    revalidateSeconds: REVALIDATE.badge,
    class: 'aggregate-badge',
  },
  approvedProfilesCount: {
    keyParts: ['admin', 'stat', 'dashboard', 'approved-profiles-count'],
    tags: [CACHE_TAGS.statDashboard],
    revalidateSeconds: REVALIDATE.stats,
    class: 'aggregate-stat',
  },
  paidMembersCount: {
    keyParts: ['admin', 'stat', 'dashboard', 'paid-members-count'],
    tags: [CACHE_TAGS.statDashboard],
    revalidateSeconds: REVALIDATE.stats,
    class: 'aggregate-stat',
  },
  pendingProfilesCount: {
    keyParts: ['admin', 'stat', 'dashboard', 'pending-profiles-count'],
    tags: [CACHE_TAGS.statDashboard],
    revalidateSeconds: REVALIDATE.stats,
    class: 'aggregate-stat',
  },
  upcomingPublishedEventsCount: {
    keyParts: ['admin', 'stat', 'dashboard', 'upcoming-published-events-count'],
    tags: [CACHE_TAGS.statDashboard],
    revalidateSeconds: REVALIDATE.stats,
    class: 'aggregate-stat',
  },
  paymentsSuccessCount: {
    keyParts: ['admin', 'stat', 'payments', 'success-count'],
    tags: [CACHE_TAGS.statPayments],
    revalidateSeconds: REVALIDATE.stats,
    class: 'aggregate-stat',
  },
  paymentsPendingCount: {
    keyParts: ['admin', 'stat', 'payments', 'pending-count'],
    tags: [CACHE_TAGS.statPayments],
    revalidateSeconds: REVALIDATE.stats,
    class: 'aggregate-stat',
  },
} as const satisfies Record<string, CachedValueDescriptor>;

/** A single membership plan reference row (portal-global). */
export interface MembershipPlanRef {
  id: string;
  name: string;
  amount: number;
}

/**
 * A full membership plan reference row (portal-global), carrying the extra
 * fields the admin settings page renders (description, type, duration, active
 * state). This is a superset of {@link MembershipPlanRef}; the minimal
 * {@link getMembershipPlans} shape is preserved for callers (e.g. the payments
 * plan dropdown) that only need id/name/amount.
 */
export interface MembershipPlanDetailed {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  membership_type: string;
  duration_months: number | null;
  is_active: boolean;
}

/**
 * Count a `profiles` rows matching an `approval_status`, portal-globally, via the
 * service-role client (no row scan beyond the exact count). Shared by the badge and
 * the dashboard pending/approved stat loaders.
 */
async function countProfilesByApprovalStatus(
  status: 'pending' | 'approved' | 'rejected'
): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', status);
  return count ?? 0;
}

/**
 * Count `payments` rows matching a `status`, portal-globally, via the service-role
 * client. Shared by the payments success/pending stat loaders.
 */
async function countPaymentsByStatus(
  status: 'pending' | 'success' | 'failed' | 'refunded'
): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  return count ?? 0;
}

// ─── Reference_Data wrappers (revalidate ≤ 300s) ──────────────────────────────────

/**
 * Cached membership plans (id, name, amount) ordered by amount ascending.
 *
 * Reference_Data: changes only via settings writes (invalidated by
 * `CACHE_TAGS.referenceMembershipPlans`). Portal-global — every admin sees the same
 * plan catalog.
 */
export const getMembershipPlans = unstable_cache(
  async (): Promise<MembershipPlanRef[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('membership_plans')
      .select('id, name, amount')
      .order('amount', { ascending: true });
    return (data ?? []) as MembershipPlanRef[];
  },
  buildCacheKey(CACHE_DESCRIPTORS.membershipPlans),
  {
    tags: CACHE_DESCRIPTORS.membershipPlans.tags,
    revalidate: CACHE_DESCRIPTORS.membershipPlans.revalidateSeconds,
  }
);

/**
 * Cached full-detail membership plans for the admin settings page (id, name,
 * description, amount, membership_type, duration_months, is_active), ordered by
 * `created_at` then `id` to match the settings list's deterministic ordering
 * (Req 9.4).
 *
 * This is a separate entry from {@link getMembershipPlans} on purpose: the
 * minimal id/name/amount shape is what the payments plan dropdown and other
 * callers rely on, and weakening it would over-fetch for those paths. Both
 * entries share the same `referenceMembershipPlans` tag, so a single settings
 * write invalidates both. Portal-global Reference_Data (`revalidate ≤ 300s`).
 */
export const getMembershipPlansDetailed = unstable_cache(
  async (): Promise<MembershipPlanDetailed[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('membership_plans')
      .select('id, name, description, amount, membership_type, duration_months, is_active')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    return (data ?? []) as MembershipPlanDetailed[];
  },
  buildCacheKey(CACHE_DESCRIPTORS.membershipPlansDetailed),
  {
    tags: CACHE_DESCRIPTORS.membershipPlansDetailed.tags,
    revalidate: CACHE_DESCRIPTORS.membershipPlansDetailed.revalidateSeconds,
  }
);

/**
 * Cached site settings. Reuses the existing `lib/site-settings.ts` data source
 * (`getPublicSiteSettings`), which reads `site_settings` via the cookie-free static
 * client and maps it to the `SiteSettings` shape — safe to call inside
 * `unstable_cache`. Portal-global Reference_Data; invalidated by
 * `CACHE_TAGS.referenceSiteSettings`.
 */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => getPublicSiteSettings(),
  buildCacheKey(CACHE_DESCRIPTORS.siteSettings),
  {
    tags: CACHE_DESCRIPTORS.siteSettings.tags,
    revalidate: CACHE_DESCRIPTORS.siteSettings.revalidateSeconds,
  }
);

// ─── Aggregate_Data: pending-approvals badge (revalidate ≤ 60s) ───────────────────

/**
 * Cached pending-approvals badge count (profiles with `approval_status = 'pending'`).
 *
 * Aggregate_Data shown in the admin layout on every page; the shortest window
 * (`REVALIDATE.badge` ≤ 60s) keeps the badge fresh. Invalidated by
 * `CACHE_TAGS.statPendingApprovals` on approve/reject writes.
 */
export const getPendingApprovalsCount = unstable_cache(
  async (): Promise<number> => countProfilesByApprovalStatus('pending'),
  buildCacheKey(CACHE_DESCRIPTORS.pendingApprovalsCount),
  {
    tags: CACHE_DESCRIPTORS.pendingApprovalsCount.tags,
    revalidate: CACHE_DESCRIPTORS.pendingApprovalsCount.revalidateSeconds,
  }
);

// ─── Aggregate_Data: dashboard stat counts (revalidate ≤ 120s) ────────────────────

/**
 * Cached count of approved profiles (dashboard "Total Alumni").
 * Invalidated by `CACHE_TAGS.statDashboard`.
 */
export const getApprovedProfilesCount = unstable_cache(
  async (): Promise<number> => countProfilesByApprovalStatus('approved'),
  buildCacheKey(CACHE_DESCRIPTORS.approvedProfilesCount),
  {
    tags: CACHE_DESCRIPTORS.approvedProfilesCount.tags,
    revalidate: CACHE_DESCRIPTORS.approvedProfilesCount.revalidateSeconds,
  }
);

/**
 * Cached count of paid members (`profiles.is_paid_member = true`; dashboard "Paid
 * Members"). Invalidated by `CACHE_TAGS.statDashboard`.
 */
export const getPaidMembersCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_paid_member', true);
    return count ?? 0;
  },
  buildCacheKey(CACHE_DESCRIPTORS.paidMembersCount),
  {
    tags: CACHE_DESCRIPTORS.paidMembersCount.tags,
    revalidate: CACHE_DESCRIPTORS.paidMembersCount.revalidateSeconds,
  }
);

/**
 * Cached count of pending profiles (dashboard "Pending Approvals" stat). This runs the
 * same query as {@link getPendingApprovalsCount} but is tagged for the dashboard stats
 * group (`CACHE_TAGS.statDashboard`) with the ≤120s stats window, whereas the layout
 * badge uses the dedicated ≤60s badge entry.
 */
export const getPendingProfilesCount = unstable_cache(
  async (): Promise<number> => countProfilesByApprovalStatus('pending'),
  buildCacheKey(CACHE_DESCRIPTORS.pendingProfilesCount),
  {
    tags: CACHE_DESCRIPTORS.pendingProfilesCount.tags,
    revalidate: CACHE_DESCRIPTORS.pendingProfilesCount.revalidateSeconds,
  }
);

/**
 * Cached count of upcoming published events (`is_published = true` and
 * `starts_at >= now`; dashboard "Upcoming Events"). `now` is evaluated when the loader
 * runs (cache miss/refresh). Invalidated by `CACHE_TAGS.statDashboard`.
 */
export const getUpcomingPublishedEventsCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { count } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true)
      .gte('starts_at', now);
    return count ?? 0;
  },
  buildCacheKey(CACHE_DESCRIPTORS.upcomingPublishedEventsCount),
  {
    tags: CACHE_DESCRIPTORS.upcomingPublishedEventsCount.tags,
    revalidate: CACHE_DESCRIPTORS.upcomingPublishedEventsCount.revalidateSeconds,
  }
);

// ─── Aggregate_Data: payments stat counts (revalidate ≤ 120s) ─────────────────────
//
// NOTE: monetary revenue (the exact sum of successful payment amounts) is deliberately
// NOT cached here. It stays an exact aggregate query owned by the page/task 8.2 because
// financial totals must be exact (Req 5.3, 5.4).

/**
 * Cached count of successful payments (payments "Successful Payments" stat).
 * Invalidated by `CACHE_TAGS.statPayments`.
 */
export const getPaymentsSuccessCount = unstable_cache(
  async (): Promise<number> => countPaymentsByStatus('success'),
  buildCacheKey(CACHE_DESCRIPTORS.paymentsSuccessCount),
  {
    tags: CACHE_DESCRIPTORS.paymentsSuccessCount.tags,
    revalidate: CACHE_DESCRIPTORS.paymentsSuccessCount.revalidateSeconds,
  }
);

/**
 * Cached count of pending payments (payments "Pending" stat).
 * Invalidated by `CACHE_TAGS.statPayments`.
 */
export const getPaymentsPendingCount = unstable_cache(
  async (): Promise<number> => countPaymentsByStatus('pending'),
  buildCacheKey(CACHE_DESCRIPTORS.paymentsPendingCount),
  {
    tags: CACHE_DESCRIPTORS.paymentsPendingCount.tags,
    revalidate: CACHE_DESCRIPTORS.paymentsPendingCount.revalidateSeconds,
  }
);
