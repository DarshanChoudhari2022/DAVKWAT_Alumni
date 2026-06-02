# Implementation Plan: Member Portal Performance

## Overview

This plan applies the six admin-portal-performance building blocks (request-scoped auth
memoization, Suspense streaming, cached reference data, estimated counts, deterministic ordering,
and trigram indexing) to the seven alumni pages: directory, announcements, events, forum,
dashboard, membership, and profile.

All foundational infrastructure already exists from the admin-portal-performance spec. This plan
focuses on **extending** existing modules (new alumni auth resolver, cache extension, new
migration) and **applying** existing patterns (streaming refactors per page). The implementation
uses TypeScript throughout, consistent with the existing codebase.

The order is: foundation (auth resolver, cache extension, migration) → per-page streaming
refactors (7 pages) → integration/config tests.

## Tasks

- [x] 1. Implement the alumni auth resolver
  - [x] 1.1 Create `lib/auth/alumni-access.ts` with `requireAlumniAccess`
    - Create `lib/auth/alumni-access.ts` exporting `getAlumniAccess()` and `requireAlumniAccess()`
    - Reuse `resolveOnce` from `lib/auth/request-context.ts` for request-scoped memoization
    - Read the trusted `x-user-id` header (already set by middleware for alumni routes) to skip redundant `auth.getUser()` calls
    - Construct an RLS-scoped Supabase client from the session cookie for data reads
    - Query profile with `approval_status === 'approved'` check; fail closed (redirect `/login`) on null/error
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.2, 7.3, 10.1_

  - [ ]* 1.2 Write property test for alumni auth single-flight per request
    - **Property 1: Auth resolution single-flight per request**
    - **Validates: Requirements 1.1, 1.2, 1.4**
    - Use a counting loader (instrumented fake); assert ≤1 identity verification + ≤1 profile lookup across sequential and concurrent callers within a single request; ≥100 iterations

  - [ ]* 1.3 Write property test for alumni authorization total decision
    - **Property 4: Authorization is a total decision**
    - **Validates: Requirements 1.7, 7.2**
    - Generate profiles with various `approval_status` values, missing profiles, and error results; assert grant iff `approval_status === 'approved'`; ≥100 iterations

  - [ ]* 1.4 Write property test for alumni auth fail-closed behavior
    - **Property 3: Auth errors fail closed**
    - **Validates: Requirements 1.6**
    - Inject errors at each step of the alumni resolver; assert deny + redirect and no alumni data returned; ≥100 iterations

- [x] 2. Extend cache layer for alumni membership plans
  - [x] 2.1 Add `getMembershipPlansForAlumni` to `lib/cache/admin-cache.ts`
    - Add `ALUMNI_CACHE_DESCRIPTORS.membershipPlansAlumni` with key `['alumni', 'reference', 'membership-plans-active']`, tag `referenceMembershipPlans`, revalidate ≤300s
    - Export `getMembershipPlansForAlumni` using `unstable_cache` with service-role client, querying active plans ordered by amount ascending
    - Share the `referenceMembershipPlans` tag so admin plan writes auto-invalidate the alumni entry
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.3_

  - [ ]* 2.2 Write property test for alumni cache identity-independent keys
    - **Property 8: Cache keys are identity-independent (no cross-user leakage)**
    - **Validates: Requirements 3.6, 7.1, 7.3**
    - For two distinct alumni user identities, assert `buildCacheKey(ALUMNI_CACHE_DESCRIPTORS.membershipPlansAlumni)` is identical and contains no identity component; ≥100 iterations

  - [ ]* 2.3 Write property test for cache load-per-window (alumni plans)
    - **Property 6: Cache issues at most one load per revalidation window**
    - **Validates: Requirements 3.1, 3.2**
    - Use a counting loader; assert ≤1 DB query for membership plans within a single revalidation window; ≥100 iterations

- [x] 3. Create the alumni directory trigram index migration
  - [x] 3.1 Create `supabase/migrations/0008_alumni_directory_indexes.sql`
    - Use `CREATE EXTENSION IF NOT EXISTS pg_trgm`
    - Add `CREATE INDEX IF NOT EXISTS` trigram GIN indexes for: `company`, `occupation`, `industry`, `current_city`, `current_state`, `current_country`
    - Do NOT recreate `full_name` or `email` indexes (already in migration `0004`)
    - All statements idempotent via `IF NOT EXISTS`; no data changes; ordering/results unchanged
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.1_

- [x] 4. Checkpoint - Ensure foundation (auth resolver, cache, migration) is ready
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Refactor the directory page (streaming + estimated counts + search + ordering)
  - [x] 5.1 Split directory into shell + list region with Suspense
    - Refactor `app/(alumni)/directory/page.tsx` to render shell (heading + filter form) synchronously
    - Move the list/pagination into an async `DirectoryListRegion` component wrapped in `<Suspense fallback={<DirectoryListSkeleton />}>`
    - Use `requireAlumniAccess()` for auth (memoized, no redundant `getUser()`)
    - Replace `count: 'exact'` with `getListCount` (estimated count + exact fallback via `Promise.all`)
    - Apply `.order('full_name').order('id')` tie-breaker for deterministic ordering
    - Display count with `formatCount` (approximate `~` indicator for estimated values)
    - Use `computePagination` for pagination math
    - Compose `DirectoryListSkeleton` from existing `CardSkeleton` / `TableRowSkeleton`
    - Handle region errors with scoped error block (shell preserved)
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 6.1, 8.3, 8.4, 9.1_

  - [ ]* 5.2 Write property test for directory deterministic ordering
    - **Property 12: Deterministic total ordering with unique tie-breaker**
    - **Validates: Requirements 5.1, 5.2**
    - Generate rows with equal `full_name` values in shuffled order; assert ordering by `full_name` + `id` is total and stable; ≥100 iterations

- [x] 6. Refactor the announcements page (streaming + estimated counts + ordering)
  - [x] 6.1 Split announcements into shell + list region with Suspense
    - Refactor `app/(alumni)/announcements/page.tsx` to render shell (heading) synchronously
    - Move list into an async region wrapped in Suspense with skeleton fallback
    - Use `requireAlumniAccess()` for auth
    - Replace `count: 'exact'` with `getListCount` via `Promise.all`
    - Apply `.order('is_pinned', { ascending: false }).order('published_at', { ascending: false }).order('id', { ascending: false })` tie-breaker
    - Display count with `formatCount`; use `computePagination`
    - Reuse existing skeleton components; handle region errors with scoped error block
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 8.3, 8.4, 9.1_

- [x] 7. Refactor the events page (streaming + estimated counts + ordering)
  - [x] 7.1 Split events into shell + list region with Suspense
    - Refactor `app/(alumni)/events/page.tsx` to render shell (heading + filter tabs) synchronously
    - Move list into an async region wrapped in Suspense with skeleton fallback
    - Use `requireAlumniAccess()` for auth
    - Replace `count: 'exact'` with `getListCount` via `Promise.all`
    - Apply `.order('starts_at', { ascending: true }).order('id', { ascending: true })` tie-breaker
    - Display count with `formatCount`; use `computePagination`
    - Reuse existing skeleton components; handle region errors with scoped error block
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 8.3, 8.4, 9.1_

- [x] 8. Refactor the forum page (streaming + ordering)
  - [x] 8.1 Split forum into shell + categories region + threads region with Suspense
    - Refactor `app/(alumni)/forum/page.tsx` to render shell (heading) synchronously
    - Move categories into an async region; move threads into a separate async region (concurrent, not sequential)
    - Use `requireAlumniAccess()` for auth
    - Apply `.order('display_order', { ascending: true }).order('id', { ascending: true })` tie-breaker on categories
    - No estimated counts (forum does not paginate — shows all active categories)
    - Issue categories and threads queries concurrently via `Promise.all` within each region
    - Reuse existing skeleton components; handle region errors with scoped error block
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.3, 8.3, 8.4, 9.1, 9.2_

- [x] 9. Refactor the dashboard page (streaming + concurrent queries)
  - [x] 9.1 Split dashboard into shell + stats regions with Suspense
    - Refactor `app/(alumni)/dashboard/page.tsx` to render shell (heading + welcome) synchronously
    - Move stats (batch peers count, upcoming events, recent announcements) into async regions wrapped in separate Suspense boundaries
    - Use `requireAlumniAccess()` for auth (profile provides `batch_year` for batch-scoped queries)
    - Issue all independent queries within each region concurrently via `Promise.all`
    - No estimated counts (fixed stats, not paginated); no deterministic ordering (limit-based, not paginated)
    - Reuse existing `StatCardSkeleton` for loading states; handle region errors with scoped error block
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 8.3, 8.4, 9.1, 9.2_

- [x] 10. Checkpoint - Ensure page refactors for directory through dashboard pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Refactor the membership page (streaming + cached plans + fresh payments)
  - [x] 11.1 Split membership into shell + plans region (cached) + payments region (fresh)
    - Refactor `app/(alumni)/membership/page.tsx` to render shell (heading + status banner) synchronously
    - Move plans into an async `PlansRegion` wrapped in `<Suspense fallback={<PlansSkeleton />}>` — reads from `getMembershipPlansForAlumni` (cached, ≤300s)
    - Move payments into an async `PaymentsRegion` wrapped in `<Suspense fallback={<PaymentsSkeleton />}>` — always fresh via the user's RLS-scoped client (never cached)
    - Use `requireAlumniAccess()` for auth
    - Plans and payments regions are independent Suspense boundaries (one does not block the other)
    - No estimated counts (plans are a short list; payments limited)
    - Reuse existing skeleton components; handle region errors with scoped error block
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.5, 3.6, 7.1, 7.3, 8.3, 8.4, 9.1, 9.2_

  - [ ]* 11.2 Write property test for alumni cache invalidation on plan write
    - **Property 7: Writes invalidate exactly the mapped cache tags**
    - **Validates: Requirements 3.4**
    - Assert that an admin write action modifying membership plans invalidates the `referenceMembershipPlans` tag, so the first alumni read post-write returns the updated catalog; ≥100 iterations

- [x] 12. Refactor the profile page (streaming + fresh identity-scoped data)
  - [x] 12.1 Split profile into shell + profile form region with Suspense
    - Refactor `app/(alumni)/profile/page.tsx` to render shell (heading + avatar placeholder) synchronously
    - Move the profile form into an async region wrapped in `<Suspense fallback={<ProfileFormSkeleton />}>`
    - Use `requireAlumniAccess()` for auth — profile data is identity-scoped, always queried fresh via RLS-scoped client
    - No caching, no estimated counts, no ordering patterns (single-record view)
    - Reuse existing skeleton components; handle region errors with scoped error block
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.5, 2.6, 3.6, 7.1, 7.3, 8.3, 8.4, 9.1, 9.2_

- [x] 13. Checkpoint - Ensure all 7 page refactors pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Write remaining property and integration tests
  - [ ]* 14.1 Write property test for unauthenticated redirect preserves destination
    - **Property 2: Unauthenticated redirect preserves destination**
    - **Validates: Requirements 1.5**
    - Generate alumni route pathnames + query strings with no valid session; assert redirect target is `/login` with `redirect` param equal to the originally requested path; ≥100 iterations

  - [ ]* 14.2 Write property test for concurrent queries within a region
    - **Property 5: Concurrent queries within a region**
    - **Validates: Requirements 2.4, 4.5**
    - Model alumni page data plans requiring multiple queries per region; assert they execute concurrently (via `Promise.all`) with ≤2 sequential round-trips per page; ≥100 iterations

  - [ ]* 14.3 Write property test for pagination reachability under estimated counts
    - **Property 9: Pagination reachability under estimated counts**
    - **Validates: Requirements 4.2**
    - Reuse the admin PBT pattern: generate arbitrary true row count, estimated count, page size, current page; assert `computePagination` allows navigation to the last real row; ≥100 iterations

  - [ ]* 14.4 Write property test for approximate count labeling
    - **Property 10: Approximate counts are labeled, exact counts are not**
    - **Validates: Requirements 4.3, 8.2**
    - Reuse the admin PBT pattern: generate `CountResult` values; assert `formatCount` includes `~` iff `isEstimated === true`; ≥100 iterations

  - [ ]* 14.5 Write property test for estimated-count failure fallback
    - **Property 11: Estimated-count failure falls back to exact**
    - **Validates: Requirements 4.4**
    - Stub the estimate RPC to error/return null; assert `getListCount` returns a usable exact result without throwing; ≥100 iterations

  - [ ]* 14.6 Write property test for result-set and pagination equivalence
    - **Property 13: Result-set and pagination equivalence**
    - **Validates: Requirements 5.2, 8.3**
    - Generate filter/search/page-size inputs; assert the union of all paginated pages equals the full ordered result set with no gaps or overlaps; ≥100 iterations

  - [ ]* 14.7 Write property test for trusted header stripping
    - **Property 14: Trusted header is stripped from inbound requests**
    - **Validates: Requirements 7.5**
    - Generate inbound requests with spoofed `x-user-id` headers; assert middleware deletes the header before verification and only sets it after successful `getUser()`; ≥100 iterations

  - [ ]* 14.8 Write integration test for index usage under representative volume
    - Seed ≥10,000 rows; run `EXPLAIN` for `ilike` queries on `company`, `occupation`, `industry`, `current_city`, `current_state`, `current_country`; assert index/bitmap scan rather than seq scan
    - _Requirements: 6.1_

  - [ ]* 14.9 Write integration test for migration idempotency
    - Apply migration `0008` twice; assert success and no duplicate index; assert identical row sets/order pre/post migration
    - _Requirements: 6.4, 6.5_

- [x] 15. Configuration assertions and CI gate
  - [x] 15.1 Verify build, lint, and type-check pass with no new errors
    - Run `npm run build`, `npm run lint`, and `npm run typecheck`; resolve any new errors so there are zero new lint/type-check errors vs baseline and no previously passing test regresses
    - _Requirements: 9.3, 9.4_

  - [ ]* 15.2 Assert revalidate-window bounds for alumni cache
    - Assert `ALUMNI_CACHE_DESCRIPTORS.membershipPlansAlumni.revalidateSeconds <= 300`
    - _Requirements: 3.2_

  - [x] 15.3 Document page applicability (non-applicable patterns)
    - Document in this file's Notes section which patterns are not applicable per page and why (forum: no estimated counts; dashboard: no estimated counts/ordering; membership: no estimated counts; profile: no list/count/ordering)
    - _Requirements: 9.2_

- [x] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; they
  encode the design's 14 correctness properties (property-based, fast-check, ≥100 iterations,
  tagged `// Feature: member-portal-performance, Property {n}: ...`) plus integration coverage.
- Each task references the specific requirement sub-clauses it satisfies for traceability.
- All infrastructure reused from admin-portal-performance — no parallel implementations created.
- Checkpoints provide incremental validation.

**Reused modules (import, do NOT recreate):**
- `lib/auth/request-context.ts` → `resolveOnce`
- `lib/db/estimated-count.ts` → `getListCount`
- `lib/db/pagination.ts` → `computePagination`
- `lib/db/ordering.ts` → `orderWithTieBreaker`
- `lib/db/count-format.ts` → `formatCount`
- `lib/cache/admin-cache.ts` → cache infrastructure, `buildCacheKey`, `CACHE_TAGS`
- `lib/cache/invalidate.ts` → `invalidateForAction`, `revalidateTag`
- `components/shared/Skeleton.tsx` → `CardSkeleton`, `TableRowSkeleton`, `StatCardSkeleton`
- `components/shared/SectionError.tsx` → scoped error block

**Non-applicable patterns per page (Req 9.2):**
- **Forum**: No estimated counts — shows all active categories without pagination.
- **Dashboard**: No estimated counts or deterministic ordering — shows fixed stats with limit-based queries, not paginated.
- **Membership**: No estimated counts — plans are a short list; payments are limited to recent records.
- **Profile**: Single-record view — no list/count/ordering patterns apply.

**Middleware verification note:** The middleware already sets `x-user-id` for alumni routes.
Task 1.1 verifies this works correctly for the new resolver but does NOT rewrite the middleware.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.2", "2.3"] },
    { "id": 2, "tasks": ["5.1", "6.1", "7.1", "8.1", "9.1"] },
    { "id": 3, "tasks": ["5.2", "11.1", "12.1"] },
    { "id": 4, "tasks": ["11.2", "14.1", "14.2", "14.3", "14.4", "14.5", "14.6", "14.7"] },
    { "id": 5, "tasks": ["14.8", "14.9", "15.1", "15.2", "15.3"] }
  ]
}
```
