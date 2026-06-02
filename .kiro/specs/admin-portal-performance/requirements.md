# Requirements Document

## Introduction

The admin portal of the DAVKAWT Alumni Portal (Next.js App Router + Supabase) loads data slowly and feels laggy when navigating between pages. Investigation of the codebase identified several recurring causes:

- **Redundant authentication resolution.** `middleware.ts` calls `supabase.auth.getUser()` (a network round-trip) on every protected request, and then `requireAdminAccess()` re-resolves authentication again in the layout, in each page, and in each Suspense child. React `cache()` only deduplicates within a single render pass, so the layout, page, and streamed children each repeat the work. The local-admin path runs up to three sequential profile queries.
- **Sequential blocking data fetches.** Most pages `await` auth, then reference data, then the list query, then several aggregate queries in sequence before rendering anything. The full page shows a skeleton until everything resolves. Only the dashboard uses Suspense streaming today.
- **Expensive exact counts.** List and stat queries use `count: 'exact'` (for example, the payments page runs four count/aggregate queries per load). Exact counts force full-table scans that degrade as data grows.
- **No caching of reference or aggregate data.** Every navigation is fully dynamic and re-queries the database, including rarely-changing reference data (membership plans, site settings) and the pending-approvals badge rendered in the layout on every page.
- **Missing or unusable indexes.** `ilike '%term%'` searches on `full_name`, `email`, and `txnid` cannot use standard B-tree indexes, and frequently filtered/ordered columns (`approval_status`, `status`, `created_at`, `is_paid_member`) may lack supporting indexes.

This feature is a portal-wide performance optimization. The goal is faster, smoother data loading across the admin portal (and the broader site where the same patterns apply), using Next.js and Supabase best practices: request-level auth memoization, Suspense streaming, targeted caching of reference and aggregate data, planned/estimated counts where exact counts are not required, and database indexing. The work must deliver measurable performance improvements without regressing security (authentication, authorization, and Row Level Security must remain enforced) and without breaking existing functionality or data correctness.

## Glossary

- **Admin_Portal**: The set of authenticated administrative pages served under the `app/(admin)/admin/*` route group (dashboard, approvals, alumni, announcements, events, forum, payments, reports, settings).
- **Admin_Page**: An individual route within the Admin_Portal that renders data for an administrator.
- **Auth_Resolver**: The server-side logic that determines the current administrator's identity, role, and approval status, currently implemented by `requireAdminAccess()` / `getAdminAccess()` in `lib/auth/admin-access.ts`.
- **Middleware_Auth**: The authentication check performed in `middleware.ts` / `lib/supabase/middleware.ts` on protected requests, currently calling `supabase.auth.getUser()`.
- **Request_Context**: The lifetime of a single incoming HTTP request to a Next.js server component tree, across the layout, page, and any streamed Suspense children.
- **Reference_Data**: Data that changes infrequently and is reused across requests, such as membership plans and site settings.
- **Aggregate_Data**: Derived summary values such as counts and sums shown in dashboard and page statistics (for example total revenue, paid-member count, pending-approval count).
- **List_Query**: A paginated query that returns a page of rows for a table view (for example the payments, alumni, or approvals lists).
- **Exact_Count**: A row count computed with Supabase/PostgREST `count: 'exact'`, which performs a full scan of matching rows.
- **Estimated_Count**: A row count obtained from PostgreSQL planner statistics (`count: 'estimated'` / `'planned'`) rather than a full scan.
- **Cache_Layer**: The Next.js server caching mechanisms used to store Reference_Data and Aggregate_Data between requests, including `unstable_cache` and route segment `revalidate`.
- **Revalidation_Window**: The maximum time a cached value may be served before it is refreshed, expressed in seconds.
- **Skeleton**: A placeholder UI displayed while data for a region is still loading.
- **Streaming_Render**: Rendering in which the page shell and ready regions are sent to the browser immediately while slower regions resolve inside Suspense boundaries.
- **Time_To_First_Byte (TTFB)**: The elapsed time from request start until the first byte of the page shell is sent to the browser.
- **RLS**: PostgreSQL Row Level Security policies enforced by Supabase that restrict which rows a user may read or write.
- **Search_Query**: A List_Query filtered by a free-text term entered by an administrator (for example searching alumni by name or email, or payments by transaction id or name).

## Requirements

### Requirement 1: Request-level authentication memoization

**User Story:** As an administrator, I want my identity to be resolved once per page load, so that pages do not pay repeated authentication round-trips and load faster.

#### Acceptance Criteria

1. WHEN an Admin_Page is rendered within a single Request_Context, THE Auth_Resolver SHALL resolve administrator identity, role, and approval status using at most one identity-verification call and at most one profile lookup per Request_Context, with subsequent calls within the same Request_Context returning the memoized result.
2. WHILE rendering the layout, page, and all Suspense children of a single Admin_Page request, THE Auth_Resolver SHALL issue zero additional `supabase.auth.getUser()` calls and zero additional profile lookups beyond the single resolution permitted by criterion 1, reusing the memoized authentication result.
3. WHERE the local-admin authentication path is used, THE Auth_Resolver SHALL resolve the local admin profile in at most one database query per Request_Context.
4. IF a request is unauthenticated or unauthorized, THEN THE Auth_Resolver SHALL redirect the request to the `/admin-login` route without rendering administrative data.
5. IF authentication resolution fails or does not complete successfully due to a backend error, THEN THE Auth_Resolver SHALL deny access and redirect to the `/admin-login` route without rendering or sending any administrative data to the browser.
6. IF an authenticated session resolves to a missing or non-administrative profile, THEN THE Auth_Resolver SHALL redirect the request to the `/admin-login` route rather than rendering administrative data.
7. WHEN multiple Suspense children of a single Admin_Page request trigger authentication resolution concurrently within one Request_Context, THE Auth_Resolver SHALL perform the underlying resolution for at most one caller and SHALL return the memoized result to all other callers.

### Requirement 2: Eliminate redundant middleware authentication round-trips

**User Story:** As an administrator, I want the routing layer to avoid duplicate authentication network calls, so that protected navigation is not slowed by redundant verification.

#### Acceptance Criteria

1. WHEN a request for a protected route is processed by Middleware_Auth, THE Middleware_Auth SHALL perform at most one authentication network round-trip to gate the route.
2. WHERE a valid local-admin session cookie is present on an admin route accessed by an admin user, THE Middleware_Auth SHALL authorize the request with zero `supabase.auth.getUser()` network calls.
3. WHEN Middleware_Auth verifies a Supabase session, THE Admin_Portal SHALL reuse the resulting verified session within the same Request_Context and SHALL issue zero additional independent session-verification network calls during page render.
4. IF a request for a protected route is unauthenticated, THEN THE Middleware_Auth SHALL redirect it to `/admin-login` (admin routes) or `/login` (alumni routes), preserving the originally requested path as a redirect query parameter.
5. IF Middleware_Auth cannot complete authentication verification due to a backend or network error, THEN THE Middleware_Auth SHALL fail closed by denying access and redirecting the request to `/admin-login` (admin routes) or `/login` (alumni routes).

### Requirement 3: Streaming render with progressive Suspense boundaries

**User Story:** As an administrator, I want pages to display their shell and fastest content immediately, so that the portal feels responsive instead of blank while data loads.

#### Acceptance Criteria

1. WHEN an Admin_Page is requested, THE Admin_Page SHALL send the page shell (heading and primary layout) to the browser without awaiting the resolution of any List_Query or Aggregate_Data region, regardless of whether the underlying queries execute concurrently or sequentially.
2. WHILE a List_Query or Aggregate_Data region of an Admin_Page is still resolving, THE Admin_Page SHALL display a Skeleton in place of that region's content.
3. THE Admin_Portal SHALL render independent data regions of an Admin_Page (regions whose queries share no data dependency on one another) within separate Suspense boundaries so that an unresolved region does not block display of regions that have already resolved.
4. WHEN multiple independent queries are required to render one region, THE Admin_Page SHALL issue those queries concurrently rather than sequentially.
5. WHERE an Admin_Page currently blocks on sequential awaits before rendering, THE Admin_Page SHALL be restructured so that the shell renders without waiting for Aggregate_Data.
6. WHEN a List_Query or Aggregate_Data region of an Admin_Page resolves, THE Admin_Page SHALL replace that region's Skeleton with the region's rendered content without re-sending the page shell.
7. IF a List_Query or Aggregate_Data region of an Admin_Page fails to resolve, THEN THE Admin_Page SHALL replace that region's Skeleton with an error indication scoped to that region while continuing to display the page shell and any regions that have already resolved.

### Requirement 4: Cache reference and aggregate data

**User Story:** As an administrator, I want infrequently-changing data to be cached, so that repeated navigation does not re-query the database on every page load.

#### Acceptance Criteria

1. WHERE data is classified as Reference_Data, THE Cache_Layer SHALL serve repeated reads of that value from cache, issuing no more than one database query for that value per Revalidation_Window.
2. WHERE data is classified as Aggregate_Data shown in portal statistics, THE Cache_Layer SHALL serve repeated reads of that value from cache, issuing no more than one database query for that value per Revalidation_Window.
3. WHEN the Revalidation_Window for a cached value elapses, THE Cache_Layer SHALL serve the existing (stale) value to the triggering request while refreshing the value from the database in a background operation that does not block that request, and SHALL serve the refreshed value to reads that occur after the background refresh completes.
4. WHEN an administrator action modifies data that backs a cached value, THE Admin_Portal SHALL invalidate the affected cache entry so that the first read after the modification completes returns the updated value rather than the previously cached value.
5. THE Admin_Portal SHALL serve the pending-approvals badge shown in the layout from a cached Aggregate_Data value with a Revalidation_Window of at most 60 seconds.
6. THE Admin_Portal SHALL define a Revalidation_Window of at most 300 seconds for cached Reference_Data.
7. THE Admin_Portal SHALL define a Revalidation_Window of at most 120 seconds for cached Aggregate_Data shown in portal statistics other than the pending-approvals badge.
8. IF a background refresh of a cached value fails, THEN THE Cache_Layer SHALL continue to serve the last successfully cached value within its Revalidation_Window and SHALL return that value to the requesting Admin_Page without surfacing the refresh error.

### Requirement 5: Replace exact counts where exact precision is not required

**User Story:** As an administrator, I want list and statistic counts to be computed efficiently, so that pages stay fast as the data set grows.

#### Acceptance Criteria

1. WHERE a displayed count drives pagination controls or a summary statistic that is not designated as requiring exactness under criterion 3, THE Admin_Page SHALL obtain the count as an Estimated_Count rather than an Exact_Count.
2. WHEN an Estimated_Count is used to render pagination controls, THE Admin_Page SHALL keep the pagination controls able to navigate to every row returned by the underlying List_Query, even when the Estimated_Count differs from the exact number of matching rows.
3. WHERE a summary statistic is retained as an Exact_Count rather than converted to an Estimated_Count, THE Admin_Page SHALL compute it as an exact value and SHALL document the specific reason the exact value is required (for example a monetary total such as total successful revenue).
4. WHEN an Aggregate_Data sum (for example total successful revenue) is displayed, THE Admin_Page SHALL compute it with a single aggregate query rather than retrieving individual rows.
5. THE Admin_Page SHALL issue the Aggregate_Data queries for a given page concurrently in a single batch rather than sequentially.
6. IF an Estimated_Count cannot be obtained for a List_Query, THEN THE Admin_Page SHALL fall back to obtaining an Exact_Count so that pagination controls remain functional rather than failing to render.

### Requirement 6: Database indexing for filter, sort, and search columns

**User Story:** As an administrator, I want list and search queries to use indexes, so that filtering and searching remain fast as tables grow.

#### Acceptance Criteria

1. WHEN a List_Query is executed at representative data volume and filtered or ordered by `approval_status`, `status`, `created_at`, or `is_paid_member`, THE query plan SHALL use an index scan rather than a sequential scan on the column(s) used for that filter or ordering.
2. WHEN a Search_Query performs case-insensitive substring matching on `full_name`, `email`, or `txnid` at representative data volume, THE query plan SHALL use an index scan (for example via a trigram index) rather than a sequential scan, in addition to the filter and sort indexes in criterion 1.
3. THE Admin_Portal SHALL provide the indexing changes as discrete database migration files committed to version control and applied in a defined version order.
4. WHEN an indexing migration is applied, THE Admin_Portal SHALL return, for identical filter, sort, and search inputs, the same set of rows in the same order as before the migration.
5. IF an indexing migration fails during application, THEN THE Admin_Portal SHALL leave the schema and data unchanged from their pre-migration state (no partial application) and SHALL surface the migration error.
6. WHEN an indexing migration is re-applied and the target index already exists, THE migration SHALL complete without error and without creating a duplicate index.

### Requirement 7: Measurable performance targets

**User Story:** As a portal owner, I want defined performance targets, so that the improvement is verifiable rather than subjective.

#### Acceptance Criteria

1. WHEN an Admin_Page is requested under representative data volume (defined as at least 10,000 rows in each primary data table backing that Admin_Page) and measured over a sample of at least 100 page requests on a fixed environment configuration, THE Admin_Page SHALL achieve a Time_To_First_Byte of 500 milliseconds or less at the 75th percentile.
2. WHEN an administrator navigates between Admin_Pages under representative data volume and measured over a sample of at least 100 navigations on a fixed environment configuration, THE Admin_Portal SHALL display meaningful content (the page shell plus at least one resolved data region or its Skeleton) within 1000 milliseconds or less at the 75th percentile, measured from navigation initiation to first contentful display.
3. IF the 75th-percentile measurement for the navigation target in criterion 2 exceeds 1000 milliseconds, THEN THE Admin_Portal SHALL record the result as a requirement violation rather than a pass.
4. THE Admin_Page SHALL issue no more than one authentication-related database round-trip per Request_Context.
5. WHEN an Admin_Page that previously issued four or more sequential count/aggregate queries is loaded under representative data volume, THE Admin_Page SHALL issue two or fewer sequential (non-concurrent) database round-trips for that page.
6. THE Admin_Portal SHALL provide a documented measurement procedure that specifies the representative data volume, a sample size of at least 100 requests, the measurement environment configuration, and the steps to capture Time_To_First_Byte and per-page database round-trip counts, such that an independent tester can reproduce the measurements and reach the same pass/fail conclusion.
7. WHEN the performance targets in this requirement are measured, THE Admin_Portal SHALL record both a pre-change baseline and a post-change result using the same data volume, sample size, and environment configuration, so that the recorded comparison reflects only the performance changes.

### Requirement 8: Preserve security and authorization

**User Story:** As a portal owner, I want performance changes to keep all access controls intact, so that optimization does not expose administrative data.

#### Acceptance Criteria

1. THE Admin_Portal SHALL continue to enforce RLS on all data reads and writes after the performance changes are applied, and WHERE a value is served from the Cache_Layer, that value SHALL have originated from a query executed under the same RLS policies that applied before the change.
2. IF a request lacks a valid administrator session, THEN THE Admin_Portal SHALL serve no administrative data (including cached Aggregate_Data and Reference_Data) and SHALL redirect the request to `/admin-login`.
3. WHERE Aggregate_Data or Reference_Data is cached, THE Cache_Layer SHALL serve a cached value only when that value is not scoped to a different administrator's identity, and SHALL NOT serve identity-scoped data of one administrator to another administrator.
4. WHEN an administrator session presents an `approved` approval status together with an `admin` or `super_admin` role, THE Auth_Resolver SHALL grant access to the Admin_Portal.
5. IF the approval status is not `approved`, OR the role is neither `admin` nor `super_admin`, OR the required conditions cannot be determined, THEN THE Auth_Resolver SHALL explicitly deny access and redirect the request to `/admin-login` rather than leaving the request in an indeterminate state.

### Requirement 9: Preserve data correctness and freshness expectations

**User Story:** As an administrator, I want cached pages to stay accurate enough for decision-making, so that I do not act on stale data.

#### Acceptance Criteria

1. WHEN an administrator approves, rejects, creates, updates, or deletes a record through the Admin_Portal and the action completes successfully, THE Admin_Portal SHALL invalidate the cache entries backing the affected Admin_Page before reporting the action as complete, so that the first subsequent read returns the updated value.
2. WHILE a cached value is within its Revalidation_Window and has not been explicitly invalidated, THE Admin_Portal MAY continue to serve the prior cached value, and any such staleness SHALL be bounded by the Revalidation_Window defined in Requirement 4 (at most 60 seconds for the pending-approvals badge, at most 120 seconds for other statistics Aggregate_Data, and at most 300 seconds for Reference_Data).
3. WHERE a value is displayed as an Estimated_Count, THE Admin_Page SHALL present it with a visible indicator that the value is approximate and SHALL NOT present it as an exact total.
4. WHEN identical filter and search inputs are submitted before and after the performance changes, THE List_Query SHALL return the same set of matching rows in the same order, using a unique tie-breaking sort column so that the ordering is deterministic.
5. WHEN the same filter, search, pagination, and export inputs are submitted before and after the performance changes, THE Admin_Portal SHALL produce the same visible result sets and the same exported file contents.
6. IF cache invalidation fails after a committed write, THEN THE Admin_Portal SHALL serve the affected value directly from the database (bypassing the stale cache entry) until invalidation succeeds, rather than serving the outdated cached value.

### Requirement 10: Scope and consistency across the portal and broader site

**User Story:** As a portal owner, I want the optimization patterns applied consistently, so that the whole portal feels fast rather than only isolated pages.

#### Acceptance Criteria

1. WHERE an Admin_Page is one of the dashboard, approvals, alumni, announcements, events, forum, payments, reports, or settings pages, THE Admin_Page SHALL satisfy every applicable acceptance criterion of Requirements 1 through 6.
2. THE Admin_Portal optimization SHALL produce a written inventory that names each public or alumni-facing page exhibiting a blocking-await pattern (Requirement 3), an exact-count pattern (Requirement 5), or an uncached-reference-data pattern (Requirement 4), identifying the specific pattern(s) each listed page exhibits.
3. WHEN an optimized Admin_Page has finished loading all of its data regions, THE Admin_Page SHALL present the same rendered visual layout and component hierarchy as its pre-optimization output, with the only permitted additions being the transient Skeleton and Suspense boundaries used during loading.
4. WHEN the optimization is complete, THE Admin_Portal SHALL satisfy all of the following: the production build succeeds, the lint check introduces zero new errors relative to the pre-optimization baseline, the type-check introduces zero new errors relative to the pre-optimization baseline, and no previously passing automated test regresses.
5. IF the production build fails, OR a new lint error is introduced, OR a new type-check error is introduced, OR a previously passing test regresses, THEN THE optimization SHALL be treated as not complete until the failure is resolved.
6. WHERE one of the nine Admin_Pages in criterion 1 does not have a given pattern from Requirements 1 through 6 applied, THE Admin_Portal optimization SHALL document the affected page and the reason the pattern is not applicable.
