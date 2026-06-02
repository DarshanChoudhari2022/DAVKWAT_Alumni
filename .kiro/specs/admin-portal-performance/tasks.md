# Implementation Plan: Admin Portal Performance

## Overview

This plan refactors the existing Next.js App Router + Supabase admin portal to be faster and
smoother by implementing the design's six reusable building blocks and applying them across the
nine admin pages. The work is sequenced so that foundational building blocks (test tooling, pure
testable seams, request-scoped auth memoization, middleware session reuse, the cache layer,
estimated counts, the indexing migration, and deterministic ordering) land first, then the
per-page streaming refactors and cache-invalidation wiring build on them, with property-based,
integration, render, and configuration tests wired alongside each block.

The implementation must preserve existing rendered output, the authorization model, RLS, and data
correctness. No new product surface area is added. Tasks marked with `*` are optional test
sub-tasks and can be skipped for a faster path, but they encode the design's 16 correctness
properties and the integration/render/config coverage.

## Tasks

- [x] 1. Set up test tooling for property-based, unit, and render tests
  - Add and configure Vitest as the test runner with a `test` script and a `test:run` (single-run) script in `package.json`
  - Add `fast-check` for property-based testing and `@testing-library/react` + `jsdom` for render/snapshot tests
  - Create a `vitest.config.ts` with path aliases matching `tsconfig.json` and a `test/` setup file
  - Verify the harness runs with a trivial passing test; do not start watch mode (use single-run)
  - _Requirements: 10.4_

- [x] 2. Extract pure-logic testable seams and cover them with property tests
  - [x] 2.1 Implement `authorizeProfile` decision seam
    - Create `lib/auth/authorize.ts` exporting `authorizeProfile(profile | null): { grant: boolean }` that grants iff `approval_status === 'approved'` and `role ∈ {admin, super_admin}`, denying for missing/indeterminate input
    - _Requirements: 1.6, 8.4, 8.5_
  - [x]* 2.2 Write property test for `authorizeProfile`
    - **Property 2: Authorization is a total decision**
    - **Validates: Requirements 1.6, 8.4, 8.5**
    - Tag: `// Feature: admin-portal-performance, Property 2: ...`; fast-check, >=100 iterations
  - [x] 2.3 Implement `computePagination` seam
    - Create `lib/db/pagination.ts` exporting `computePagination({ rowsReturned, pageSize, page, estimate }): { totalPages, hasNext }` using `max(estimate, offset + rowsReturned + (fullPage ? pageSize : 0))`; a short page is terminal
    - _Requirements: 5.2_
  - [x]* 2.4 Write property test for `computePagination` reachability
    - **Property 11: Pagination reachability under estimated counts**
    - **Validates: Requirements 5.2**
    - fast-check, >=100 iterations, tagged with the Property 11 comment
  - [x] 2.5 Implement `orderWithTieBreaker` seam
    - Create `lib/db/ordering.ts` exporting `orderWithTieBreaker(rows, sortKey, dir)` that orders by the display sort key then unique `id`, producing a total order independent of input arrival order
    - _Requirements: 6.4, 9.4_
  - [x]* 2.6 Write property test for deterministic ordering
    - **Property 14: Deterministic total ordering with unique tie-breaker**
    - **Validates: Requirements 6.4, 9.4**
    - Include inputs with equal primary sort keys and shuffled arrival order; >=100 iterations
  - [x]* 2.7 Write property test for result-set / pagination / export equivalence
    - **Property 15: Result-set, pagination, and export equivalence**
    - **Validates: Requirements 9.5**
    - Assert the union of paginated pages (under `orderWithTieBreaker` + `computePagination`) equals the full ordered set with no gaps/overlaps and matches export ordering; >=100 iterations
  - [x] 2.8 Implement `formatCount` seam
    - Add `formatCount(result: CountResult): string` (in `lib/db/estimated-count.ts` or `lib/utils/format.ts`) rendering a `~`/`(approximate)` indicator iff `isEstimated` is true, never labeling estimates as exact totals
    - _Requirements: 9.3_
  - [x]* 2.9 Write property test for count labeling
    - **Property 12: Approximate counts are labeled, exact counts are not**
    - **Validates: Requirements 9.3**
    - fast-check, >=100 iterations, tagged with the Property 12 comment

- [x] 3. Checkpoint - Ensure pure-seam tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement request-scoped auth memoization
  - [x] 4.1 Create request-stable memo holder
    - Create `lib/auth/request-context.ts` with a `cache()`-created holder `{ promise }` (one instance per request) and a `resolveOnce(resolveActorProfile)` single-flight wrapper
    - _Requirements: 1.1, 1.2, 1.7_
  - [x] 4.2 Collapse local-admin resolver into one query
    - In `lib/auth/admin-access.ts`, replace `resolveLocalAdminProfile`'s up-to-three sequential queries with a single precedence-ordered query (explicit id, then email, then earliest approved admin)
    - _Requirements: 1.3_
  - [x] 4.3 Reuse the middleware-verified identity and reuse `authorizeProfile`
    - Read the trusted `x-admin-user-id` header to skip `auth.getUser()` when present, falling back to `getUser()` only when absent; route the grant/deny decision through `authorizeProfile`; wrap DB calls in try/catch and fail closed to `/admin-login` on null/error
    - Wire `requireAdminAccess`/`getAdminAccess` through `resolveOnce` so layout, page, and Suspense children share one resolution
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.4, 8.4, 8.5_
  - [x]* 4.4 Write property test for auth single-flight per request
    - **Property 1: Auth resolution single-flight per request**
    - **Validates: Requirements 1.1, 1.2, 1.7, 2.3, 7.4**
    - Use a counting auth backend (instrumented fake); assert <=1 verification + <=1 profile lookup across sequential and concurrent callers; >=100 iterations
  - [x]* 4.5 Write property test for one-query local-admin resolver
    - **Property 4: Local-admin profile resolves in one query**
    - **Validates: Requirements 1.3**
    - Generate combinations of explicit id / email match / approved-admin existence; assert <=1 query and correct precedence winner; >=100 iterations
  - [x]* 4.6 Write property test for auth fail-closed behavior (resolver side)
    - **Property 3: Auth errors fail closed**
    - **Validates: Requirements 1.5, 2.5**
    - Inject errors at each resolver step; assert deny + redirect and no administrative result; >=100 iterations

- [x] 5. Implement middleware session reuse
  - [x] 5.1 Set and strip the trusted identity header; fail closed
    - In `lib/supabase/middleware.ts`, keep the single `getUser()` gate and the local-admin zero-call short-circuit; delete any inbound `x-admin-user-id` before verification; after a successful `getUser()`, set `x-admin-user-id` on the forwarded request headers; wrap verification in try/catch and redirect to `/admin-login` (admin) or `/login` (alumni) on backend/network error
    - Preserve the `redirect` query parameter for unauthenticated protected routes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x]* 5.2 Write property test for middleware auth round-trip count
    - **Property 5: Middleware auth round-trip count**
    - **Validates: Requirements 2.1, 2.2**
    - Generate (route class, local-admin cookie present/absent); assert <=1 network round-trip and 0 `getUser()` for valid local-admin cookie on admin routes; >=100 iterations
  - [x]* 5.3 Write property test for unauthenticated redirect target + destination preservation
    - **Property 6: Unauthenticated redirect preserves destination**
    - **Validates: Requirements 2.4**
    - Generate protected pathnames + query strings; assert correct login target per route class and `redirect` param equals requested path; >=100 iterations

- [x] 6. Checkpoint - Ensure auth and middleware tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement the cache layer
  - [x] 7.1 Create cache wrappers, tags, keys, and revalidate windows
    - Create `lib/cache/admin-cache.ts` with `CACHE_TAGS`, `REVALIDATE` (`badge: 60`, `stats: 120`, `reference: 300`), a `buildCacheKey(descriptor)` helper producing identity-independent keys (no actor id, no auth mode), and `unstable_cache` wrappers for `getMembershipPlans`, `getSiteSettings`, `getPendingApprovalsCount`, and dashboard/payments stat aggregates
    - Enforce the invariant that only portal-global (non-identity-scoped) values are cached
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8, 8.1, 8.3_
  - [x] 7.2 Create the invalidation helper with dirty-set bypass
    - Create `lib/cache/invalidate.ts` exporting `invalidateForAction(action): string[]` (the exact tag mapping) and an invalidate function that calls `revalidateTag` per mapped tag, wrapped in try/catch; on failure record the tag in a request-scoped dirty set, and provide a read wrapper that bypasses cache to the DB while a tag is dirty
    - _Requirements: 4.4, 9.1, 9.6_
  - [x]* 7.3 Write property test for cache load-per-window
    - **Property 7: Cache issues at most one load per revalidation window**
    - **Validates: Requirements 4.1, 4.2**
    - Use a fake cache recording loader invocations; assert <=1 load per window across read sequences; >=100 iterations
  - [x]* 7.4 Write property test for write -> exact tag invalidation
    - **Property 8: Writes invalidate exactly the mapped cache tags**
    - **Validates: Requirements 4.4, 9.1**
    - For each action type assert `invalidateForAction` returns exactly the mapped tag set (no missing, no extra); >=100 iterations
  - [x]* 7.5 Write property test for invalidation-failure cache bypass
    - **Property 9: Invalidation failure forces cache bypass**
    - **Validates: Requirements 9.6**
    - Simulate failing `revalidateTag`; assert subsequent reads bypass cache to DB until a later invalidation succeeds; >=100 iterations
  - [x]* 7.6 Write property test for identity-independent cache keys
    - **Property 16: Cache keys are identity-independent (no cross-admin leakage)**
    - **Validates: Requirements 8.3**
    - For two distinct admin identities and either auth mode, assert `buildCacheKey` is identical and contains no identity/mode component; >=100 iterations

- [x] 8. Implement estimated counts with exact fallback
  - [x] 8.1 Create the read-only EXPLAIN-based Postgres function migration
    - Create `supabase/migrations/0006_estimate_filtered_count.sql` defining `estimate_filtered_count(...)` as `LANGUAGE plpgsql STABLE SECURITY INVOKER` returning the planner's `EXPLAIN (FORMAT JSON)` `plan.rows` for a parameterized filter (no row scan); use `CREATE OR REPLACE` for idempotency
    - _Requirements: 5.1, 6.3_
  - [x] 8.2 Implement `getListCount` with fallback and exact monetary totals
    - Create `lib/db/estimated-count.ts` exporting `getListCount(client, opts): { count, isEstimated }` that calls the RPC first and falls back to `count: 'exact'` (`isEstimated = false`) on error/null without throwing; keep monetary totals (e.g., total successful revenue) as a single exact aggregate query, never estimated
    - _Requirements: 5.1, 5.3, 5.4, 5.6_
  - [x]* 8.3 Write property test for estimated-count fallback
    - **Property 10: Estimated-count failure falls back to exact**
    - **Validates: Requirements 5.6**
    - Stub the estimate RPC to error / return null; assert `getListCount` returns a usable exact result without throwing; >=100 iterations

- [x] 9. Implement the indexing gap-fill migration
  - [x] 9.1 Add idempotent gap-fill indexes
    - Create `supabase/migrations/0007_admin_perf_indexes.sql` adding `CREATE INDEX IF NOT EXISTS idx_profiles_paid_created ON profiles (is_paid_member, created_at DESC)` and any standalone `created_at` index only if EXPLAIN shows a seq scan; use `CREATE INDEX IF NOT EXISTS` / `CREATE EXTENSION IF NOT EXISTS` throughout so re-application is a no-op
    - Document that `0004_admin_performance.sql` already provides pg_trgm + most btree/GIN indexes; this migration is gap-fill + idempotency hardening only
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

- [x] 10. Create the shared streaming section pattern and apply deterministic ordering
  - [x] 10.1 Establish the streaming page/section scaffolding
    - Define the standard structure (shell renders synchronously; stats region and list region each in their own `Suspense` boundary; region components run concurrent queries via `Promise.all`; region-local try/catch renders a scoped error block) and confirm reuse of `components/shared/Skeleton.tsx` (`StatCardSkeleton`, `TableRowSkeleton`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.5, 7.5_
  - [x] 10.2 Apply the unique `id` tie-breaker to all List_Query orderings
    - Update each List_Query to append `.order('id', { ascending })` after the display sort column so identical inputs return identical row order
    - _Requirements: 9.4, 9.5_

- [ ] 11. Refactor the payments page (4+ sequential queries -> streaming + estimated counts + cache)
  - [x] 11.1 Split payments into shell + stats region + list region
    - Render `app/(admin)/admin/payments/page.tsx` shell synchronously; move stats into a cached Aggregate_Data region (counts via cache, exact monetary revenue via single aggregate) and the list into a region using `getListCount` + concurrent queries; apply tie-breaker ordering and the approximate indicator
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5, 7.5, 9.3, 10.1, 10.3_
  - [ ]* 11.2 Write render/snapshot test for payments streaming + layout equivalence
    - Assert shell renders before regions resolve, skeletons show while pending, resolved content replaces skeletons, a failing region shows a scoped error while the shell persists, and the fully-resolved layout matches the pre-optimization baseline
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 10.3_
  - [x]* 11.3 Write property test for refactored sequential round-trip bound (payments)
    - **Property 13: Refactored pages issue at most two sequential round-trips**
    - **Validates: Requirements 3.4, 5.5, 7.5**
    - Model the payments data plan; assert <=2 sequential round-trips with concurrent per-region batching and reused auth; >=100 iterations

- [ ] 12. Refactor the alumni page (streaming + estimated counts + search)
  - [x] 12.1 Split alumni into shell + stats region + list region
    - Refactor `app/(admin)/admin/alumni/page.tsx` to the streaming pattern; use `getListCount` for pagination with the approximate indicator; run `is_paid_member`/status filters and `ilike` search through indexed columns; apply tie-breaker ordering
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.5, 6.1, 6.2, 9.3, 10.1, 10.3_
  - [ ]* 12.2 Write render/snapshot test for alumni streaming + layout equivalence
    - Cover shell-before-regions, skeleton swap, scoped region error, and layout equivalence with baseline
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 10.3_

- [ ] 13. Refactor the approvals page (streaming + estimated counts) and wire the badge cache
  - [x] 13.1 Split approvals into shell + stats/badge region + list region
    - Refactor `app/(admin)/admin/approvals/page.tsx` to the streaming pattern; serve the pending-approvals badge from `getPendingApprovalsCount` (cached, <=60s); use `getListCount` for the list with tie-breaker ordering
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.2, 4.5, 5.1, 5.2, 5.5, 9.3, 10.1, 10.3_
  - [ ]* 13.2 Write render/snapshot test for approvals streaming + layout equivalence
    - Cover shell-before-regions, skeleton swap, scoped region error, and layout equivalence with baseline
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 10.3_

- [ ] 14. Refactor announcements, events, and forum list pages
  - [x] 14.1 Refactor the announcements page to streaming + estimated counts
    - Apply the streaming pattern to `app/(admin)/admin/announcements/page.tsx`; `getListCount` + tie-breaker ordering + approximate indicator
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.5, 9.3, 10.1, 10.3_
  - [x] 14.2 Refactor the events page to streaming + estimated counts
    - Apply the streaming pattern to `app/(admin)/admin/events/page.tsx`; `getListCount` + tie-breaker ordering + approximate indicator
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.5, 9.3, 10.1, 10.3_
  - [x] 14.3 Refactor the forum page to streaming + estimated counts
    - Apply the streaming pattern to `app/(admin)/admin/forum/page.tsx`; `getListCount` + tie-breaker ordering + approximate indicator
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.5, 9.3, 10.1, 10.3_
  - [ ]* 14.4 Write render/snapshot tests for announcements, events, and forum streaming + layout equivalence
    - Cover shell-before-regions, skeleton swap, scoped region error, and layout equivalence with baseline for each page
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 10.3_

- [ ] 15. Refactor the reports page (streaming + cached/estimated aggregates)
  - [x] 15.1 Split reports into shell + cached stat regions
    - Refactor `app/(admin)/admin/reports/page.tsx` so the shell and `ReportsCharts.tsx` mount synchronously while cached/estimated Aggregate_Data regions stream; keep monetary totals exact; apply the approximate indicator to estimated counts
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.2, 5.1, 5.3, 5.4, 5.5, 9.3, 10.1, 10.3_
  - [ ]* 15.2 Write render/snapshot test for reports streaming + layout equivalence
    - Cover shell-before-regions, skeleton swap, scoped region error, and layout equivalence with baseline
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 10.3_

- [ ] 16. Refactor the settings page to use cached Reference_Data
  - [x] 16.1 Serve membership plans and site settings from the cache layer
    - Refactor `app/(admin)/admin/settings/page.tsx` to read `getMembershipPlans` and `getSiteSettings` (cached, <=300s) under the streaming pattern; preserve the rendered layout
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 4.1, 4.6, 10.1, 10.3_
  - [ ]* 16.2 Write render/snapshot test for settings streaming + layout equivalence
    - Cover shell-before-regions, skeleton swap, scoped region error, and layout equivalence with baseline
    - _Requirements: 3.1, 3.2, 3.6, 3.7, 10.3_

- [x] 17. Apply cache reads to the dashboard (already streaming)
  - [x] 17.1 Route dashboard aggregates through the cache layer
    - Update `app/(admin)/admin/page.tsx` so its existing Suspense regions read dashboard stat counts via cached Aggregate_Data (<=120s) and the pending-approvals badge via `getPendingApprovalsCount` (<=60s); keep monetary totals exact and preserve the rendered layout
    - _Requirements: 3.3, 3.4, 4.2, 4.5, 4.7, 5.4, 5.5, 10.1, 10.3_

- [x] 18. Checkpoint - Ensure all page refactor and render tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Wire cache invalidation into existing write actions
  - [x] 19.1 Invalidate on approve/reject
    - Call `invalidateForAction` for `statPendingApprovals` + `statDashboard` after committed approve/reject writes (`/api/admin/approve`, `/reject`)
    - _Requirements: 4.4, 9.1, 9.6_
  - [x] 19.2 Invalidate on alumni edit / membership change
    - Invalidate `statDashboard` + `statPayments` from the alumni edit / membership-change write path (`app/(admin)/admin/alumni/[id]/*`)
    - _Requirements: 4.4, 9.1, 9.6_
  - [x] 19.3 Invalidate on payment status change / manual membership
    - Invalidate `statPayments` + `statDashboard` from the payment status write path
    - _Requirements: 4.4, 9.1, 9.6_
  - [x] 19.4 Invalidate on settings save
    - Invalidate `referenceMembershipPlans` + `referenceSiteSettings` from the settings save actions (`SettingsActions.tsx` / plan + site settings forms)
    - _Requirements: 4.4, 9.1, 9.6_
  - [x] 19.5 Invalidate on event publish/unpublish
    - Invalidate `statDashboard` from the event publish/unpublish action
    - _Requirements: 4.4, 9.1, 9.6_

- [ ] 20. Write integration tests for infrastructure not covered by PBT
  - [ ]* 20.1 Index usage under representative volume
    - Seed >=10,000 rows; run `EXPLAIN`/`EXPLAIN ANALYZE` for filtered, ordered, and `ilike` queries on `approval_status`, `status`, `created_at`, `is_paid_member`, `full_name`, `email`, `txnid`; assert index/bitmap scans rather than seq scans
    - _Requirements: 6.1, 6.2_
  - [ ]* 20.2 Migration idempotency and atomicity
    - Apply `0006`/`0007` twice (assert success, no duplicate index); simulate a failing statement and assert rollback (no partial apply) with a surfaced error; assert identical row sets/order pre/post migration
    - _Requirements: 6.4, 6.5, 6.6_
  - [ ]* 20.3 Stale-while-revalidate and last-good-on-failure
    - Against the Next.js cache, assert the stale value is served on the triggering request after expiry, the refreshed value is served on the next read, and the last-good value is retained when the loader throws
    - _Requirements: 4.3, 4.8_
  - [ ]* 20.4 RLS preserved after refactor
    - Confirm RLS policies still apply to reads/writes after the refactor and that cached values originate from RLS-equivalent reads
    - _Requirements: 8.1_

- [x] 21. Add configuration smoke assertions for revalidate windows
  - [x]* 21.1 Assert revalidate-window bounds
    - Assert `REVALIDATE.badge <= 60`, `REVALIDATE.stats <= 120`, `REVALIDATE.reference <= 300`
    - _Requirements: 4.5, 4.6, 4.7_

- [x] 22. Document and script the performance measurement procedure
  - [x] 22.1 Author the reproducible measurement procedure
    - Create a documented procedure (e.g., `.kiro/specs/admin-portal-performance/performance-measurement.md` plus a seeding/measurement script) specifying >=10,000-row data volume, fixed environment (`next build && next start`), >=100 requests/navigations sample, TTFB and per-page DB round-trip capture, p75 computation, the targets (TTFB p75 <= 500ms, navigation p75 <= 1000ms, <=1 auth round-trip, <=2 sequential round-trips on previously-4+ pages), violation recording when navigation p75 > 1000ms, and a baseline-vs-result comparison under identical conditions
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 23. Final completion: CI gate and portal-wide inventory
  - [x] 23.1 Verify build, lint, and type-check pass with no new errors
    - Run `npm run build`, `npm run lint`, and `npm run typecheck`; resolve any new errors so there are zero new lint/type-check errors vs baseline and no previously passing test regresses
    - _Requirements: 10.4, 10.5_
  - [x] 23.2 Produce the portal-wide pattern inventory
    - Create a written inventory (e.g., `.kiro/specs/admin-portal-performance/portal-inventory.md`) naming each public/alumni-facing page (`app/(alumni)/*`, `app/(public)/*`, etc.) exhibiting a blocking-await pattern (Req 3), exact-count pattern (Req 5), or uncached-reference-data pattern (Req 4), labeling the specific pattern(s) per page, and documenting any of the nine admin pages where a pattern is intentionally not applicable with the reason
    - _Requirements: 10.2, 10.6_

- [x] 24. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP; they
  implement the design's 16 correctness properties (property-based, fast-check, >=100 iterations,
  tagged `// Feature: admin-portal-performance, Property {n}: ...`) plus integration, render, and
  configuration coverage.
- Each task references the specific requirement sub-clauses it satisfies for traceability.
- Foundational building blocks (test tooling, pure seams, auth memoization, middleware reuse,
  cache layer, estimated counts, indexing, deterministic ordering) come before the per-page
  refactors, which depend on them.
- Pure-logic properties (2, 11, 12, 14, 15, 16) test extracted functions directly; behavioral
  properties (1, 3, 4, 5, 7, 8, 9, 10, 13) use instrumented fakes (counting auth backend, fake
  cache recording loads/invalidations, stubbed estimate RPC).
- Checkpoints provide incremental validation; monetary totals always stay exact; RLS and the
  authorization model must remain intact across all changes.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "2.8", "4.1", "5.1", "7.1", "8.1", "9.1", "10.1", "22.1"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "2.7", "2.9", "4.2", "7.2", "8.2", "10.2", "21.1"] },
    { "id": 3, "tasks": ["4.3", "5.2", "7.3", "7.4", "7.5", "7.6", "8.3", "20.1", "20.2", "20.3", "20.4"] },
    { "id": 4, "tasks": ["4.4", "4.5", "4.6", "5.3", "11.1", "12.1", "13.1", "14.1", "14.2", "14.3", "15.1", "16.1", "17.1"] },
    { "id": 5, "tasks": ["11.2", "11.3", "12.2", "13.2", "14.4", "15.2", "16.2", "19.1", "19.2", "19.3", "19.4", "19.5"] },
    { "id": 6, "tasks": ["23.1", "23.2"] }
  ]
}
```
