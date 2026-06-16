# Portal-Wide Performance Pattern Inventory

> Task 23.2 · Requirements 10.2 and 10.6
>
> This is an **audit / future-work inventory**, not a change set. It records where the three
> performance anti-patterns the admin refactor addressed still appear on the public and
> alumni-facing surface, and documents the admin pages where a Requirements 1–6 pattern was
> intentionally **not** applied (with the reason). No pages outside the nine admin pages were
> changed by this work; the rows below mark candidates for the same streaming / caching /
> estimated-count treatment in a later pass.

## Patterns being tracked

| Tag | Pattern | Requirement | What it means |
|-----|---------|-------------|---------------|
| **BA** | Blocking-await render | Req 3 | The page `await`s its data (auth → reference → list → aggregates) before sending any shell; the whole page shows nothing (or the route-level `loading.tsx`) until everything resolves. No per-region `<Suspense>` streaming. |
| **EC** | Exact-count | Req 5 | A list/stat count uses Supabase `count: 'exact'`, forcing a full scan of matching rows. Drives pagination or a summary number that does not require exactness. |
| **URD** | Uncached reference-data | Req 4 | Rarely-changing reference data (e.g. `membership_plans`, `site_settings`) is re-queried from the database on every request instead of being served from a bounded-revalidate cache layer. |

Classification method: each `page.tsx` under `app/(alumni)/*` and `app/(public)/*` was read in full.
A page is tagged **BA** if it performs server-side data fetching and contains no `<Suspense>`
boundary (verified: zero `Suspense` imports exist outside `app/(admin)/*`). It is tagged **EC** for
each `count: 'exact'` occurrence, and **URD** when it issues an inline reference-data query with no
cache wrapper and no route-segment `revalidate`.

---

## 1. Alumni-facing pages — `app/(alumni)/*`

All alumni pages today fetch server-side with sequential `await`s and **no `<Suspense>` boundaries**,
so every one that fetches data exhibits the blocking-await pattern (BA). The alumni `layout.tsx` was
already optimized (it carries no per-request data and renders a static shell), so the lag is now
concentrated in the page bodies below.

| Page (`app/(alumni)/…`) | Kind | Patterns | Notes |
|---|---|---|---|
| `announcements/page.tsx` | list | **BA**, **EC** | `count: 'exact'` drives pagination; sequential `await` of client + ranged list before render. |
| `announcements/[slug]/page.tsx` | detail | **BA** | Single record `await` before render; no Suspense. No count. |
| `dashboard/page.tsx` | dashboard | **BA**, **EC** | Awaits `getUser` → profile, then a 3-query `Promise.all`; `count: 'exact', head: true` for the batch-peers stat. Queries are already batched, but the shell still blocks on all of them (no Suspense). |
| `directory/page.tsx` | list + search | **BA**, **EC** | `count: 'exact'` for pagination **and** for the "{count} alumni" header; free-text `ilike` OR-search across `full_name`/`company`/`occupation`/`industry`. Strongest candidate for estimated-count + streaming. |
| `directory/[id]/page.tsx` | detail | **BA** | `select('*')` single profile `await` before render. No count. |
| `events/page.tsx` | list | **BA**, **EC** | `count: 'exact'` drives pagination; upcoming/past filter. |
| `events/[slug]/page.tsx` | detail | **BA**, **EC** | Awaits `getUser` → event, then a `Promise.all` whose second query is a `count: 'exact', head: true` "going" count. |
| `forum/page.tsx` | list | **BA**, *(in-memory count)* | Two **sequential** queries (categories, then all threads) before render. Does **not** use `count: 'exact'`; instead it loads every thread row and counts per-category in JavaScript — a distinct count anti-pattern that scales worse than an exact count. Flag for an aggregate/grouped-count rework. |
| `forum/[categorySlug]/page.tsx` | thread list | **BA**, **EC** | Sequential `await` of category, then threads with `count: 'exact'` for pagination. |
| `forum/[categorySlug]/[threadId]/page.tsx` | thread + replies | **BA**, **EC** | Four sequential `await`s (`getUser`, thread, category, replies) before render; `count: 'exact'` on replies for pagination. |
| `membership/page.tsx` | account + plans | **BA**, **URD** | Awaits `getUser`, then a 3-query `Promise.all`; the **`membership_plans`** read (`is_active`, order by amount) is re-queried every request with no cache layer — the same Reference_Data the admin settings page now serves from `getMembershipPlans*`. No `count: 'exact'`. |
| `membership/receipt/[txnid]/page.tsx` | detail | **BA** | Awaits `getUser` → single payment (with a `membership_plans(name, type)` join). The join is row-scoped to one payment, **not** a reference-data re-query, so it is not URD. No count. |
| `profile/page.tsx` | form | **BA** | Awaits `getUser` → own profile (`select('*')`) before render. No count. |

### Alumni summary

- **Blocking-await (BA):** every data-fetching alumni page (13 of 13). None use Suspense streaming.
- **Exact-count (EC):** `announcements`, `dashboard`, `directory`, `events`, `events/[slug]`,
  `forum/[categorySlug]`, `forum/[categorySlug]/[threadId]` (7 pages). Plus `forum` with a separate
  in-memory counting anti-pattern.
- **Uncached reference-data (URD):** `membership/page.tsx` (`membership_plans`).

---

## 2. Public pages — `app/(public)/*`

| Page (`app/(public)/…`) | Kind | Patterns | Notes |
|---|---|---|---|
| `page.tsx` (landing) | landing | **BA**, **EC** | `export const dynamic = 'force-dynamic'; revalidate = 0` — fully re-queried each request. Awaits a 3-query `Promise.all` (events, announcements, **`count: 'exact', head: true`** approved-alumni count) before render. No Suspense. The alumni count and recent lists are portal-global Aggregate_Data and are candidates for the cache layer. |
| `membership-plans/page.tsx` | Fee | **BA**, **URD** | `force-dynamic; revalidate = 0`; awaits `getPlans()` which queries **`membership_plans`** (`is_active`, order by amount) on every request with no cache — the same Reference_Data the admin settings page caches. No count. |
| `about/page.tsx` | content | *(none — already mitigated)* | Reads `site_settings` via `getPublicSiteSettings()`, **but** sets `export const revalidate = 300`, so the segment is ISR-cached within the same 300s bound the admin `getSiteSettings()` cache uses. Listed for completeness; it does **not** exhibit the URD pattern. |
| `admin-login`, `login`, `register`, `forgot-password`, `verify-email`, `pending-approval`, `auth/reset-password` | auth/forms | *(none)* | Client forms / server actions; no server-side list/reference reads in the page render path. |
| `features`, `terms`, `privacy`, `refund` | static content | *(none)* | Static marketing/legal content; no data fetching. |

### Public summary

- **Blocking-await (BA):** `page.tsx` (landing), `membership-plans/page.tsx`.
- **Exact-count (EC):** `page.tsx` (landing) — approved-alumni count.
- **Uncached reference-data (URD):** `membership-plans/page.tsx` (`membership_plans`).
- `about/page.tsx` already caches its `site_settings` reference data via route-segment ISR
  (`revalidate = 300`) and is **not** a violation.

---

## 3. Cross-cutting future-work candidates

These reuse the exact building blocks delivered for the admin portal
(`lib/cache/admin-cache.ts`, `lib/db/estimated-count.ts`, the streaming shell/region pattern):

1. **Shared `membership_plans` cache.** `app/(alumni)/membership` and `app/(public)/membership-plans`
   both re-query `membership_plans` per request. A public-facing cache wrapper (mirroring
   `getMembershipPlans`, invalidated by the existing `referenceMembershipPlans` tag on settings
   writes) would remove the duplicate uncached reads.
2. **Estimated counts for alumni-facing pagination.** `directory`, `events`, `announcements`,
   `forum/[categorySlug]`, and the forum thread/reply lists can move from `count: 'exact'` to
   `getListCount` + `computePagination`, with an exact fallback where free-text OR-search is present
   (the same carve-out already used by the admin alumni page).
3. **Streaming on alumni list/detail pages.** Wrapping list and stat regions in `<Suspense>` (reusing
   `components/shared/Skeleton.tsx`) would let the shell render immediately, matching the admin pattern.
4. **Forum landing aggregate count.** `app/(alumni)/forum` should replace its load-all-threads /
   count-in-JS approach with a grouped count (or estimated count) per category.
5. **Landing-page aggregate cache.** The `force-dynamic` home page recomputes its approved-alumni
   count and recent content on every hit; these are portal-global and cacheable.

---

## 4. Admin pages — intentional non-application of a Requirements 1–6 pattern (Req 10.6)

The nine admin pages each satisfy every **applicable** acceptance criterion of Requirements 1–6
(Req 10.1). Where a specific pattern was deliberately **not** applied to a page, the reason is below.
(Request-scoped auth memoization — Req 1 — and middleware session reuse — Req 2 — apply uniformly to
all nine via `requireAdminAccess()` and the middleware header, so they are not repeated per row.)

| Admin page | Pattern intentionally not applied | Reason |
|---|---|---|
| **dashboard** | Estimated counts (Req 5.1) for pagination | The dashboard has no paginated List_Query, so there is no pagination count to estimate. Its stat counts are served as **cached exact head-counts** (`getApprovedProfilesCount`, `getPaidMembersCount`, etc.) because they are portal-global aggregates served at most once per revalidation window — cheap and accurate. Monetary totals stay exact (Req 5.3/5.4). |
| **approvals** | Estimated count (Req 5) for the pending-approvals **badge** | The list uses `getListCount` (estimated). The badge/count is served from the cached **exact** `getPendingApprovalsCount` (≤60s) rather than an estimate, because it is a single cached portal-global value and the badge should reflect a real pending total. |
| **alumni** | Estimated count (Req 5.1) **when a free-text search term is present** | The `estimate_filtered_count` RPC cannot express the search OR-predicate (`full_name ILIKE … OR email ILIKE …`). When `hasSearch` is true the page falls back to an **exact** count with the identical OR predicate (Req 5.6); the estimate path is used only for non-search filters. |
| **announcements** | Caching (Req 4) of the list | The announcements list is neither Reference_Data nor a portal statistic, so it is not placed in the cache layer; it streams via Suspense with an estimated count instead. |
| **events** | Caching (Req 4) of the list | Same rationale as announcements — the events list is dynamic per-filter data, not cacheable Reference/Aggregate data; it streams with an estimated count. (Event publish/unpublish still invalidates the cached dashboard `upcoming-events` stat via Req 19.5.) |
| **forum** | Estimated counts (Req 5) **and** pagination | The forum admin page has **no pagination and no list count** — it renders the full categories list plus the 20 most recent threads (`.limit(20)`). With no List_Query count to drive pagination, estimated counts are not applicable. Deterministic tie-breaker ordering (Req 6.4/9.4) is still applied. |
| **payments** | Estimated count (Req 5) for **revenue total** | Total successful revenue is a **monetary total** and must be exact (Req 5.3/5.4), so it stays a single exact aggregate (`amount.sum()`) and never flows through `getListCount`. Pagination and status counts do use cached/estimated counts. |
| **reports** | Estimated count (Req 5) for **monetary totals** | Same as payments: revenue/financial figures are computed exactly (Req 5.3/5.4); only the non-monetary stat counts are cached/estimated. |
| **settings** | Estimated counts (Req 5) and indexing (Req 6); minimal-shape plan cache | Settings renders small full lists (membership plans, site settings, admin users) with **no pagination**, so estimated counts and large-table search/sort indexes are not applicable. Membership plans here use the dedicated **`getMembershipPlansDetailed`** cache helper (full fields: description, type, duration, `is_active`) instead of the minimal `getMembershipPlans` (id/name/amount) used by the payments plan dropdown — the settings form needs the full record, and both share the `referenceMembershipPlans` tag so one settings write invalidates both. |

---

## Appendix — verification basis

- `<Suspense>` usage: confirmed present only under `app/(admin)/*` (layout badge, dashboard,
  payments, alumni, approvals, announcements, events, forum, reports, settings). No alumni/public
  page imports `Suspense`.
- `count: 'exact'` occurrences outside admin: `app/(public)/page.tsx`,
  `app/(alumni)/dashboard/page.tsx`, `app/(alumni)/directory/page.tsx`,
  `app/(alumni)/events/page.tsx`, `app/(alumni)/events/[slug]/page.tsx`,
  `app/(alumni)/announcements/page.tsx`, `app/(alumni)/forum/[categorySlug]/page.tsx`,
  `app/(alumni)/forum/[categorySlug]/[threadId]/page.tsx`.
- Uncached `membership_plans` reads: `app/(alumni)/membership/page.tsx`,
  `app/(public)/membership-plans/page.tsx` (both inline, no cache wrapper, `revalidate = 0`).
- `site_settings` reads: `app/(public)/about/page.tsx` via `getPublicSiteSettings()` with
  route-segment `revalidate = 300` (already cached — not a URD violation).
