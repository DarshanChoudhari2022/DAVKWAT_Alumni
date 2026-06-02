# Requirements Document

## Introduction

The alumni (member) portal of the DAVKAWT Alumni Portal (Next.js App Router + Supabase) suffers from the same performance anti-patterns already addressed on the admin side: redundant authentication round-trips, blocking sequential data fetches, expensive exact counts, uncached reference data, missing search indexes, and non-deterministic ordering. Investigation of the seven alumni pages (`directory`, `announcements`, `events`, `forum`, `dashboard`, `membership`, `profile`) under `app/(alumni)/` identifies:

- **Redundant authentication resolution.** Middleware already calls `supabase.auth.getUser()` and sets `x-admin-user-id` (now `x-user-id` for alumni), but every alumni page independently calls `supabase.auth.getUser()` again (dashboard, membership, profile) or constructs its own client without reusing the middleware-verified identity. The same layout/page/Suspense cross-boundary memoization gap from the admin side applies here.
- **Sequential blocking data fetches.** Pages `await` all data before rendering anything — the directory page awaits its full filtered query and count; the dashboard awaits auth, profile, then three parallel queries but only after the sequential auth/profile resolution; the membership page awaits auth, then three parallel queries.
- **Expensive exact counts.** The directory, announcements, and events pages use `count: 'exact'` for pagination. At scale these force full-table scans on filtered subsets.
- **No caching of membership plans.** Every membership page load re-queries `membership_plans` despite plans changing rarely. Forum categories and dashboard stats remain uncached (no caching scope for these per clarification).
- **Missing trigram indexes for directory search.** The directory page searches across `full_name`, `company`, `occupation`, `industry`, `current_city`, `current_state`, `current_country` using `ilike '%term%'` — the existing migration only covers `full_name` and `email`. Additional trigram indexes are needed.
- **Non-deterministic ordering.** List queries lack a unique tie-breaker, meaning paginated results may shift between pages when rows share the same sort key.

This spec extends the building blocks already implemented in the admin-portal-performance spec (request-scoped auth memoization via trusted header, Suspense streaming pattern, estimated counts with fallback, cache layer with `unstable_cache`, deterministic ordering, skeleton components) to the alumni side. The goal is faster, smoother member page loading without regressing security (alumni RLS, per-request auth gate) or data correctness.

## Glossary

- **Member_Portal**: The set of authenticated alumni pages served under the `app/(alumni)/*` route group (directory, announcements, events, forum, dashboard, membership, profile).
- **Member_Page**: An individual route within the Member_Portal that renders data for an authenticated alumni user.
- **Alumni_Auth_Resolver**: The server-side logic that determines the current alumni user's identity and approval status by reusing the middleware-verified user id rather than issuing redundant `supabase.auth.getUser()` calls.
- **Middleware_Auth**: The authentication check performed in `middleware.ts` / `lib/supabase/middleware.ts` on protected alumni requests, calling `supabase.auth.getUser()` once and forwarding the verified identity via the trusted header.
- **Trusted_Identity_Header**: A server-set request header (`x-user-id`) that carries the middleware-verified Supabase user id downstream to the RSC tree. The middleware strips any client-supplied copy before verification and sets it only after successful server-side `getUser()`.
- **Request_Context**: The lifetime of a single incoming HTTP request to a Next.js server component tree, across the layout, page, and any streamed Suspense children.
- **Reference_Data**: Data that changes infrequently and is reused across requests. In the alumni context this includes membership plans.
- **Identity_Scoped_Data**: Data tied to a specific user's identity (profile, payment history). This data is never cached.
- **List_Query**: A paginated query that returns a page of rows for a list view (directory, announcements, events).
- **Exact_Count**: A row count computed with Supabase/PostgREST `count: 'exact'`, performing a full scan of matching rows.
- **Estimated_Count**: A row count obtained from PostgreSQL planner statistics rather than a full scan.
- **Cache_Layer**: The Next.js server caching mechanism (`unstable_cache`) used to store Reference_Data between requests with bounded revalidation windows.
- **Revalidation_Window**: The maximum time a cached value may be served before it is refreshed, expressed in seconds.
- **Skeleton**: A placeholder UI displayed while data for a region is still loading.
- **Streaming_Render**: Rendering in which the page shell and ready regions are sent to the browser immediately while slower regions resolve inside Suspense boundaries.
- **RLS**: PostgreSQL Row Level Security policies enforced by Supabase that restrict which rows a user may read or write.
- **Search_Query**: A List_Query filtered by a free-text term entered by an alumni user (for example searching the directory by name, company, occupation, industry, or location).
- **Trigram_Index**: A PostgreSQL GIN index using the `pg_trgm` extension that supports efficient `ilike '%term%'` substring matching.

## Requirements

### Requirement 1: Request-level authentication memoization for alumni routes

**User Story:** As an alumni user, I want my identity to be resolved once per page load, so that pages do not pay repeated authentication round-trips and load faster.

#### Acceptance Criteria

1. WHEN a Member_Page is rendered within a single Request_Context, THE Alumni_Auth_Resolver SHALL resolve alumni identity and approval status using at most one identity-verification call per Request_Context, with subsequent calls within the same Request_Context returning the memoized result.
2. WHILE rendering the layout, page, and all Suspense children of a single Member_Page request, THE Alumni_Auth_Resolver SHALL issue zero additional `supabase.auth.getUser()` calls beyond the single resolution performed by Middleware_Auth, reusing the Trusted_Identity_Header to identify the user.
3. WHEN Middleware_Auth verifies a Supabase session for an alumni route, THE Middleware_Auth SHALL set the Trusted_Identity_Header on the forwarded request so that all downstream components within the same Request_Context can reuse the verified identity without issuing independent session-verification network calls.
4. WHEN multiple Suspense children of a single Member_Page request trigger authentication resolution concurrently within one Request_Context, THE Alumni_Auth_Resolver SHALL perform the underlying resolution for at most one caller and SHALL return the memoized result to all other callers.
5. IF a request for an alumni route is unauthenticated or the session cannot be verified, THEN THE Middleware_Auth SHALL redirect the request to `/login` preserving the originally requested path as a `redirect` query parameter.
6. IF authentication resolution fails due to a backend or network error, THEN THE Middleware_Auth SHALL deny access and redirect to `/login` without rendering or sending any alumni data to the browser.
7. IF an authenticated session resolves to a missing profile or a profile with `approval_status` other than `approved`, THEN THE Middleware_Auth SHALL redirect the request away from the Member_Portal without rendering alumni data.

### Requirement 2: Streaming render with progressive Suspense boundaries

**User Story:** As an alumni user, I want pages to display their shell and fastest content immediately, so that the portal feels responsive instead of blank while data loads.

#### Acceptance Criteria

1. WHEN a Member_Page is requested, THE Member_Page SHALL send the page shell (heading and primary layout) to the browser without awaiting the resolution of any List_Query, Identity_Scoped_Data query, or aggregated data region.
2. WHILE a data region of a Member_Page is still resolving, THE Member_Page SHALL display a Skeleton in place of that region's content.
3. THE Member_Portal SHALL render independent data regions of a Member_Page within separate Suspense boundaries so that an unresolved region does not block display of regions that have already resolved.
4. WHEN multiple independent queries are required to render one region, THE Member_Page SHALL issue those queries concurrently rather than sequentially.
5. WHEN a data region of a Member_Page resolves, THE Member_Page SHALL replace that region's Skeleton with the region's rendered content without re-sending the page shell.
6. IF a data region of a Member_Page fails to resolve, THEN THE Member_Page SHALL replace that region's Skeleton with an error indication scoped to that region while continuing to display the page shell and any regions that have already resolved.
7. WHERE a Member_Page is one of the directory, announcements, events, forum, dashboard, membership, or profile pages, THE Member_Page SHALL implement the Streaming_Render pattern with Suspense boundaries.

### Requirement 3: Cache membership plans as Reference_Data

**User Story:** As an alumni user, I want membership plan data to load instantly from cache, so that the membership page and any plan references render quickly without hitting the database on every navigation.

#### Acceptance Criteria

1. WHERE data is classified as Reference_Data (membership plans), THE Cache_Layer SHALL serve repeated reads of that value from cache, issuing no more than one database query for that value per Revalidation_Window.
2. THE Member_Portal SHALL define a Revalidation_Window of at most 300 seconds for cached membership plans.
3. WHEN the Revalidation_Window for cached membership plans elapses, THE Cache_Layer SHALL serve the existing (stale) value to the triggering request while refreshing the value from the database in a background operation, and SHALL serve the refreshed value to reads that occur after the background refresh completes.
4. WHEN an administrator modifies membership plans through the Admin_Portal, THE Admin_Portal SHALL invalidate the membership plans cache entry so that the first read after the modification returns the updated value.
5. IF a background refresh of the cached membership plans fails, THEN THE Cache_Layer SHALL continue to serve the last successfully cached value within its Revalidation_Window without surfacing the refresh error to the user.
6. WHERE data is classified as Identity_Scoped_Data (user profile, payment history), THE Member_Portal SHALL NOT cache that data and SHALL always query it fresh from the database under the user's RLS-scoped session.

### Requirement 4: Replace exact counts with estimated counts on list pages

**User Story:** As an alumni user, I want list page counts to be computed efficiently, so that the directory, announcements, and events pages remain fast as data grows.

#### Acceptance Criteria

1. WHERE a displayed count drives pagination controls on the directory, announcements, or events pages, THE Member_Page SHALL obtain the count as an Estimated_Count rather than an Exact_Count.
2. WHEN an Estimated_Count is used to render pagination controls, THE Member_Page SHALL keep the pagination controls able to navigate to every row returned by the underlying List_Query, even when the Estimated_Count differs from the exact number of matching rows.
3. WHERE a count is displayed as an Estimated_Count, THE Member_Page SHALL present it with a visible indicator that the value is approximate (for example a `~` prefix) and SHALL NOT present it as an exact total.
4. IF an Estimated_Count cannot be obtained for a List_Query (RPC error or unusable estimate), THEN THE Member_Page SHALL fall back to obtaining an Exact_Count so that pagination controls remain functional rather than failing to render.
5. THE Member_Page SHALL issue the list query and count retrieval concurrently in a single batch rather than sequentially.

### Requirement 5: Deterministic ordering with unique tie-breaker

**User Story:** As an alumni user, I want paginated lists to produce stable, repeatable ordering so that I do not see duplicate or missing items when navigating pages.

#### Acceptance Criteria

1. WHEN a List_Query is executed on the directory, announcements, or events page, THE Member_Page SHALL append a unique tie-breaking sort column (`id`) after the primary sort column(s) so that identical filter and sort inputs always produce the same row order.
2. WHEN identical filter, search, and pagination inputs are submitted before and after the performance changes, THE List_Query SHALL return the same set of matching rows in the same deterministic order.
3. WHERE the forum page lists categories ordered by `display_order`, THE Member_Page SHALL append `id` as a tie-breaker so that categories sharing the same display_order value appear in a stable sequence.

### Requirement 6: Database indexing for directory search columns

**User Story:** As an alumni user, I want directory searches to use indexes so that searching by name, company, occupation, industry, or location remains fast as the alumni table grows.

#### Acceptance Criteria

1. WHEN a Search_Query performs case-insensitive substring matching on `full_name`, `company`, `occupation`, `industry`, `current_city`, `current_state`, or `current_country` at representative data volume, THE query plan SHALL use a Trigram_Index scan rather than a sequential scan.
2. THE Member_Portal SHALL provide the indexing changes as discrete database migration files committed to version control and applied in a defined version order.
3. WHEN an indexing migration is applied, THE Member_Portal SHALL return, for identical filter, sort, and search inputs, the same set of rows in the same order as before the migration.
4. IF an indexing migration fails during application, THEN THE Member_Portal SHALL leave the schema and data unchanged from their pre-migration state (no partial application) and SHALL surface the migration error.
5. WHEN an indexing migration is re-applied and the target index already exists, THE migration SHALL complete without error and without creating a duplicate index.
6. WHERE `full_name` and `email` trigram indexes already exist from a prior migration, THE new migration SHALL create only the missing indexes (`company`, `occupation`, `industry`, `current_city`, `current_state`, `current_country`) using `CREATE INDEX IF NOT EXISTS` for idempotency.

### Requirement 7: Preserve security and RLS enforcement

**User Story:** As a portal owner, I want performance changes to keep all access controls intact, so that optimization does not expose alumni data inappropriately.

#### Acceptance Criteria

1. THE Member_Portal SHALL continue to enforce RLS on all data reads after the performance changes are applied, and WHERE a value is served from the Cache_Layer, that value SHALL have originated from a query that is not identity-scoped and is safe to serve to any authenticated alumni user.
2. IF a request lacks a valid alumni session, THEN THE Member_Portal SHALL serve no alumni data (including cached Reference_Data) and SHALL redirect the request to `/login`.
3. WHERE Identity_Scoped_Data (user profile, payment history) is queried, THE Member_Page SHALL always use the user's own RLS-scoped Supabase client so that one user's identity-scoped data is never accessible to another user.
4. THE Middleware_Auth SHALL run the authentication gate on every request to the Member_Portal, and cached Reference_Data SHALL only be read after the auth gate has confirmed a valid session.
5. WHEN the Trusted_Identity_Header is processed, THE Middleware_Auth SHALL strip any client-supplied copy of the header from the inbound request before verification, and SHALL set it only after successful server-side identity verification.

### Requirement 8: Preserve data correctness and freshness

**User Story:** As an alumni user, I want pages to show accurate data so that I can trust what I see in the portal.

#### Acceptance Criteria

1. WHILE a cached value is within its Revalidation_Window and has not been explicitly invalidated, THE Member_Portal MAY serve the prior cached value, and any such staleness SHALL be bounded by the Revalidation_Window (at most 300 seconds for membership plans).
2. WHERE a value is displayed as an Estimated_Count, THE Member_Page SHALL present it with a visible indicator that the value is approximate and SHALL NOT present it as an exact total.
3. WHEN identical filter and search inputs are submitted before and after the performance changes, THE List_Query SHALL return the same set of matching rows in the same order, confirming that the optimization did not alter query semantics.
4. WHEN an optimized Member_Page has finished loading all of its data regions, THE Member_Page SHALL present the same rendered visual layout and component hierarchy as its pre-optimization output, with the only permitted additions being the transient Skeleton and Suspense boundaries used during loading.

### Requirement 9: Scope and consistency across all alumni pages

**User Story:** As a portal owner, I want the optimization patterns applied consistently across all alumni pages, so that the entire member experience feels fast.

#### Acceptance Criteria

1. WHERE a Member_Page is one of the directory, announcements, events, forum, dashboard, membership, or profile pages, THE Member_Page SHALL satisfy every applicable acceptance criterion of Requirements 1 through 6.
2. WHERE a Member_Page does not have a given pattern from Requirements 1 through 6 applied (for example estimated counts do not apply to the forum page because it does not paginate), THE Member_Portal optimization SHALL document the affected page and the reason the pattern is not applicable.
3. WHEN the optimization is complete, THE Member_Portal SHALL satisfy all of the following: the production build succeeds, the lint check introduces zero new errors relative to the pre-optimization baseline, the type-check introduces zero new errors relative to the pre-optimization baseline, and no previously passing automated test regresses.
4. IF the production build fails, OR a new lint error is introduced, OR a new type-check error is introduced, OR a previously passing test regresses, THEN THE optimization SHALL be treated as not complete until the failure is resolved.

### Requirement 10: Reuse existing admin-portal-performance infrastructure

**User Story:** As a developer, I want the member portal optimization to reuse the building blocks already implemented for the admin portal, so that there is no duplicated infrastructure and the patterns remain consistent across the codebase.

#### Acceptance Criteria

1. WHERE the admin-portal-performance spec has implemented a building block (request-scoped auth memoization, trusted header middleware pattern, Suspense streaming layout, estimated count utility, cache layer with `unstable_cache`, deterministic ordering pattern, skeleton components), THE Member_Portal optimization SHALL reuse or extend that existing implementation rather than creating a parallel implementation.
2. WHEN the Trusted_Identity_Header pattern is extended to alumni routes, THE Middleware_Auth SHALL use the same header-stripping and server-set mechanism already implemented for admin routes, extended to cover the alumni route class.
3. WHERE the estimated count utility (`lib/db/estimated-count.ts`) and the cache layer (`lib/cache/`) already exist from the admin optimization, THE Member_Portal SHALL import and use those modules directly.
4. WHERE skeleton components (`components/shared/Skeleton.tsx`) already exist, THE Member_Portal SHALL reuse or compose from those existing components for alumni page loading states.
