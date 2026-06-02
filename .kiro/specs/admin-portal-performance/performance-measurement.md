# Admin Portal Performance — Measurement Procedure (Runbook)

> Reproducible procedure for Requirement 7 of the `admin-portal-performance` spec.
> An independent tester following this runbook end-to-end MUST reach the same
> pass/fail conclusion for the same code, data volume, sample size, and environment.
>
> Traceability: this runbook satisfies **Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**
> and supports the design's "Performance measurement procedure (Req 7)" section.

---

## 0. Targets at a glance

| ID  | Metric | Target (PASS) | Recorded as |
|-----|--------|---------------|-------------|
| 7.1 | Page request **TTFB**, p75, ≥100 requests, ≥10k rows | **≤ 500 ms** | pass / fail |
| 7.2 | **Navigation to meaningful content** (shell + ≥1 resolved region or its Skeleton), p75, ≥100 navigations | **≤ 1000 ms** | pass / fail |
| 7.3 | Navigation p75 **> 1000 ms** | n/a | **recorded as a violation** (never a pass) |
| 7.4 | **Auth-related DB round-trips** per request | **≤ 1** | pass / fail |
| 7.5 | **Sequential DB round-trips** on pages that previously issued 4+ (payments, alumni, approvals, reports) | **≤ 2** | pass / fail |
| 7.6 | A documented, reproducible procedure exists | this document | n/a |
| 7.7 | **Baseline vs result** captured under identical volume/sample/environment | comparison table | n/a |

"p75" = 75th percentile of the sorted sample (see [§6 p75 computation](#6-p75-computation)).

---

## 1. What gets measured (pages under test)

The nine admin pages in `app/(admin)/admin/*`:

| Page | Route | Primary table(s) (≥10k rows each) | Previously 4+ sequential queries? |
|------|-------|-----------------------------------|-----------------------------------|
| Dashboard | `/admin` | `profiles`, `payments` | no (already streamed) |
| Approvals | `/admin/approvals` | `profiles` | yes |
| Alumni | `/admin/alumni` | `profiles` | yes |
| Announcements | `/admin/announcements` | `announcements` | no |
| Events | `/admin/events` | `events` | no |
| Forum | `/admin/forum` | `forum_threads` | no |
| Payments | `/admin/payments` | `payments`, `profiles` | **yes (4 count/aggregate)** |
| Reports | `/admin/reports` | `profiles`, `payments` | yes |
| Settings | `/admin/settings` | `membership_plans`, `site_settings` | no |

The **7.5 sequential-round-trip** check applies to the pages marked "yes" (payments, alumni,
approvals, reports). The **7.1 / 7.2** TTFB and navigation checks apply to **every** page.

---

## 2. Representative data volume (Req 7.1)

"Representative data volume" = **at least 10,000 rows in each primary data table** backing the
page under test. The seed target below is **12,000 rows per table** to stay comfortably above the
10k floor after any de-duplication.

Primary tables seeded:

- `profiles` (drives alumni, approvals, dashboard, reports)
- `payments` (drives payments, reports, dashboard)
- `events` (drives events)
- `announcements` (drives announcements)
- `forum_threads` (drives forum)

`membership_plans` and `site_settings` are Reference_Data (a handful of rows); they are **not**
volume-seeded — they are exercised through the cache layer, not row volume.

### 2.1 Seeding (recommended: SQL bulk insert)

> ⚠️ **TEST / STAGING DATABASE ONLY. NEVER run against production.** The seed script writes
> thousands of synthetic rows into `auth.users` and `profiles`. It is non-destructive (insert-only,
> idempotent) but it pollutes the data set. Always point it at a disposable database.

The seed is `scripts/seed-perf-data.sql`. It is **idempotent** (re-running does not add duplicates;
all rows use deterministic IDs and `ON CONFLICT DO NOTHING`) and **fail-closed** (it refuses to run
unless you explicitly opt in with a session GUC).

Run it against the **direct** Postgres connection (use `DIRECT_URL` from `.env.local`; a direct
connection is required because the seed runs DDL-free bulk inserts inside one transaction):

```bash
# 1) Confirm you are pointing at a TEST/STAGING database (inspect the host!)
echo $DIRECT_URL

# 2) Seed. The "SET perf.seed_confirm" line is the required opt-in; the script
#    raises an exception and aborts if it is missing.
psql "$DIRECT_URL" -c "SET perf.seed_confirm = 'yes';" -f scripts/seed-perf-data.sql
```

PowerShell (Windows):

```powershell
# Inspect host first
$env:DIRECT_URL
psql $env:DIRECT_URL -c "SET perf.seed_confirm = 'yes';" -f scripts/seed-perf-data.sql
```

To change the volume, edit the single `target` constant near the top of
`scripts/seed-perf-data.sql` (default `12000`).

Verify the volume after seeding:

```bash
psql "$DIRECT_URL" -c "select 'profiles' t, count(*) from profiles
  union all select 'payments', count(*) from payments
  union all select 'events', count(*) from events
  union all select 'announcements', count(*) from announcements
  union all select 'forum_threads', count(*) from forum_threads
  order by t;"
```

Each primary table must report **≥ 10,000**.

### 2.2 Cleanup

All seeded rows are tagged (synthetic emails end in `@perf.seed.local`, payment `txnid` values
start with `PERFSEED-`, slugs start with `perf-seed-`). Remove them with:

```bash
psql "$DIRECT_URL" -c "SET perf.seed_confirm = 'yes';" -f scripts/cleanup-perf-data.sql
```

### 2.3 Alternative seeding approach (service-role client)

If you cannot open a direct `psql` connection, you can seed through the existing service-role
Supabase client (`lib/supabase/admin.ts`, env var `SUPABASE_SERVICE_ROLE_KEY`) by creating auth
users with `supabase.auth.admin.createUser(...)` and then inserting the dependent rows. This is
considerably slower (per-row HTTP) and is documented only as a fallback; prefer the SQL bulk insert
in §2.1. Whichever method is used, the volume verification in §2.1 is the source of truth.

---

## 3. Fixed environment configuration (Req 7.1, 7.2, 7.7)

The baseline and the result MUST be captured on the **same** environment. Record every field of
this table for each run.

| Field | Value to record |
|-------|-----------------|
| Machine / instance class | e.g. local dev laptop (CPU, RAM) or cloud instance type |
| OS | e.g. Windows 11 / Ubuntu 22.04 |
| Node version | output of `node -v` |
| Next.js version | from `package.json` (`next`) |
| Build command | **`npm run build`** (production build) |
| Serve command | **`npm run start`** (i.e. `next start`, production server) |
| App URL | e.g. `http://localhost:3000` |
| Supabase instance / region | same project + region for baseline and result |
| DB row volume | profiles / payments / events / announcements / forum_threads counts |
| Auth mode | local-admin cookie OR Supabase session (keep identical across runs) |
| Cache state | **cold** vs **warm** (see §3.2) — record separately, never mix |

### 3.1 Build and serve (production, never `next dev`)

`next dev` is **not** a valid measurement target (no production optimizations, no real streaming
characteristics). Always measure the production server:

```bash
npm run build
npm run start   # serves the optimized build (next start) on http://localhost:3000
```

PowerShell: same commands. Leave `next start` running in its own terminal for the duration of a
measurement run.

### 3.2 Warm vs cold cache

The cache layer (Req 4: `unstable_cache`, `revalidate` windows) and the in-process auth memo make
the **first** request to a page slower than subsequent ones. To keep results comparable:

1. **Warm-up:** after `next start`, issue **20 discard requests** per page under test (not counted
   in the sample) to populate the route/render and data caches.
2. **Cold reading (optional, recorded separately):** to measure cold behavior, restart `next start`
   and let cached values expire (or wait past the largest `revalidate` window, 300 s) before the
   first request.
3. Record warm and cold numbers in **separate** rows. Do **not** average warm and cold together.

The headline pass/fail for 7.1/7.2 is taken from the **warm** sample (steady-state navigation),
which is what an administrator experiences during a session. Cold numbers are recorded for context.

---

## 4. Sampling (Req 7.1, 7.2)

Collect **at least 100** measurements per page for each metric.

### 4.1 TTFB sample (Req 7.1) — `curl -w`

`curl` reports the time to the first response byte via `%{time_starttransfer}` (seconds). Capture
≥100 samples per page into a file, one value (in milliseconds) per line.

Bash:

```bash
URL="http://localhost:3000/admin/payments"
COOKIE="<paste the admin session/local-admin cookie here>"
OUT="ttfb-payments-result.txt"
: > "$OUT"
for i in $(seq 1 100); do
  curl -s -o /dev/null \
    -H "Cookie: $COOKIE" \
    -w '%{time_starttransfer}\n' "$URL" \
  | awk '{printf "%.1f\n", $1*1000}' >> "$OUT"   # seconds -> ms
done
wc -l "$OUT"   # must be >= 100
```

PowerShell:

```powershell
$Url    = "http://localhost:3000/admin/payments"
$Cookie = "<paste the admin session/local-admin cookie here>"
$Out    = "ttfb-payments-result.txt"
Remove-Item $Out -ErrorAction SilentlyContinue
1..100 | ForEach-Object {
  $sec = curl.exe -s -o NUL -H "Cookie: $Cookie" -w "%{time_starttransfer}" $Url
  [math]::Round([double]$sec * 1000, 1)
} | Set-Content $Out
(Get-Content $Out).Count   # must be >= 100
```

> The `Cookie` header carries an authenticated admin session so the request is not redirected to
> `/admin-login`. Obtain it from the browser dev tools (Application → Cookies) after logging in, or
> from the local-admin login flow. Use the **same** cookie/auth mode for baseline and result.

#### TTFB via a load tool (alternative)

[`autocannon`](https://github.com/mcollina/autocannon) gives a percentile summary directly:

```bash
npx autocannon -c 1 -a 100 \
  -H "Cookie: $COOKIE" \
  http://localhost:3000/admin/payments
```

- `-c 1` (one connection) approximates sequential admin navigation; `-a 100` = 100 requests.
- Read **p75 latency** from the table. `autocannon`'s latency is request → full response, which is
  ≥ TTFB; for the strict TTFB target use the `curl -w time_starttransfer` method above and treat
  `autocannon` as a cross-check.

[`k6`](https://k6.io/) equivalent (uses `http_req_waiting` ≈ TTFB):

```js
// k6-ttfb.js
import http from 'k6/http';
export const options = { vus: 1, iterations: 100 };
const COOKIE = __ENV.ADMIN_COOKIE;
export default function () {
  http.get('http://localhost:3000/admin/payments', { headers: { Cookie: COOKIE } });
}
// run: k6 run --summary-trend-stats="p(75)" -e ADMIN_COOKIE="<cookie>" k6-ttfb.js
// read p(75) of http_req_waiting (server wait ≈ TTFB)
```

### 4.2 Navigation-to-meaningful-content sample (Req 7.2)

"Meaningful content" = the page shell **plus at least one resolved data region or its Skeleton**
is displayed. Because the shell streams before data (Req 3), the meaningful-content moment is
effectively when the **first contentful paint** of the streamed shell occurs. Measure it from
**navigation initiation** to **first contentful display**. Two acceptable capture methods:

**A. Browser Performance API (closest to user experience).** With the app open and logged in, run
in the dev-tools console for each in-portal navigation (≥100 navigations across the pages):

```js
// Run once per navigation; collects the First Contentful Paint relative to navigation start.
const nav = performance.getEntriesByType('navigation')[0];
const fcp = performance.getEntriesByName('first-contentful-paint')[0];
console.log((fcp.startTime).toFixed(1)); // ms from navigation start to first contentful display
```

Automate with a Playwright/Puppeteer script that logs in once, then performs ≥100 link navigations
between admin pages, recording `first-contentful-paint` each time into a file (one ms value per
line). Keep navigation **sequential** (single tab) to model a real admin session.

**B. TTFB proxy (lower-bound proxy, when no browser automation is available).** Since the shell is
streamed first and contains meaningful layout, the server `time_starttransfer` from §4.1 is a
lower bound for meaningful content. If using this proxy, **state it explicitly** in the results and
prefer method A for the official 7.2 number.

Save ≥100 values (ms) to e.g. `nav-payments-result.txt`.

---

## 5. Capturing DB round-trip counts (Req 7.4, 7.5)

Round-trip counts are **not** timing — they are exact integer counts of database queries issued
while rendering one page request.

### 5.1 Auth-related round-trips (Req 7.4: ≤ 1 per request)

Count the authentication-related DB calls per request: at most **one** identity verification
(`auth.getUser()` or the local-admin profile lookup) per Request_Context.

Capture options:

- **Supabase dashboard → Logs → API / Postgres logs:** filter to a single request window and count
  calls to `/auth/v1/user` (getUser) and the auth profile lookup. Expect **≤ 1** auth verification
  and **≤ 1** profile lookup for the whole page render (layout + page + all Suspense children).
- **Postgres `pg_stat_statements` delta:** snapshot `calls` for the profile-lookup statement before
  and after a single request; the delta for auth resolution must be **≤ 1**.

Procedure:

```sql
-- enable once on the test DB
create extension if not exists pg_stat_statements;
select pg_stat_statements_reset();
-- issue exactly ONE page request to /admin/payments here, then:
select query, calls
from pg_stat_statements
where query ilike '%profiles%'
order by calls desc
limit 20;
```

The auth profile-resolution statement must show **calls ≤ 1** for the single request.

### 5.2 Sequential round-trips on previously-4+ pages (Req 7.5: ≤ 2)

For payments / alumni / approvals / reports, count the number of **sequential** (non-concurrent)
DB round-trips for one page render. Regions batch their queries concurrently (`Promise.all`), so
concurrent queries within a region count as **one** sequential step.

Method:

1. Reset stats: `select pg_stat_statements_reset();`
2. Issue exactly **one** request to the page (warm auth/cache).
3. Inspect the Postgres logs for that request window and group queries by start time. Queries that
   start together (within the same few-ms batch) are one concurrent batch = **one** sequential
   round-trip. Count the number of distinct sequential batches.
4. Assert the count is **≤ 2** (e.g. batch 1 = auth reuse / cached stats; batch 2 = list query +
   estimated count run concurrently).

Record the observed query plan (which queries ran in which batch) alongside the count so the result
is auditable.

---

## 6. p75 computation

Given a file with one numeric sample per line, p75 is the value at the 75th percentile of the
sorted samples (nearest-rank method: index = ceil(0.75 × N), 1-based).

Node (works cross-platform):

```bash
node -e "const fs=require('fs');const xs=fs.readFileSync(process.argv[1],'utf8').trim().split(/\r?\n/).map(Number).filter(n=>!isNaN(n)).sort((a,b)=>a-b);const i=Math.max(0,Math.ceil(0.75*xs.length)-1);console.log('N='+xs.length+' p75='+xs[i].toFixed(1)+' ms');" ttfb-payments-result.txt
```

PowerShell:

```powershell
$xs = Get-Content ttfb-payments-result.txt | ForEach-Object { [double]$_ } | Sort-Object
$i  = [math]::Max(0, [math]::Ceiling(0.75 * $xs.Count) - 1)
"N=$($xs.Count) p75=$([math]::Round($xs[$i],1)) ms"
```

`N` must be ≥ 100 for a valid sample.

---

## 7. Pass/fail and violation recording (Req 7.3)

For each page and metric:

1. Compute p75 from the ≥100-sample file (§6).
2. Compare against the target in [§0](#0-targets-at-a-glance).
3. Record `PASS` if p75 ≤ target, otherwise `FAIL`.
4. **Req 7.3 — violation rule:** if the **navigation** p75 (7.2) is **> 1000 ms**, the result MUST
   be recorded as a **requirement violation**, never as a pass — even if it is "close". The
   violation is logged in the results table's status column as `VIOLATION (7.3)`.

Round-trip checks (7.4, 7.5) are integer comparisons: `≤ 1` and `≤ 2` respectively; any higher
count is a `FAIL`.

---

## 8. Baseline vs result comparison (Req 7.7)

Capture **two** runs under **identical** data volume, sample size, and environment:

- **Baseline:** the pre-change build (git checkout of the commit/tag before the optimization work,
  e.g. the branch point) seeded to the same volume and measured with the same commands.
- **Result:** the post-change build.

Only the code differs between the two runs. Record both in the tables below.

### 8.1 Run metadata (fill in for BOTH baseline and result)

| Field | Baseline | Result |
|-------|----------|--------|
| Git commit / tag | | |
| Date / time | | |
| Machine / instance | | |
| Node / Next.js version | | |
| Build + serve command | `npm run build` + `npm run start` | `npm run build` + `npm run start` |
| Supabase instance / region | | |
| profiles / payments / events / announcements / forum_threads counts | | |
| Auth mode (local-admin / supabase) | | |
| Cache state (warm / cold) | | |
| Sample size N (per page) | | |

### 8.2 TTFB p75 (Req 7.1, target ≤ 500 ms)

| Page | Baseline p75 (ms) | Result p75 (ms) | Δ (ms) | Result status |
|------|-------------------|-----------------|--------|---------------|
| /admin (dashboard) | | | | PASS / FAIL |
| /admin/approvals | | | | PASS / FAIL |
| /admin/alumni | | | | PASS / FAIL |
| /admin/announcements | | | | PASS / FAIL |
| /admin/events | | | | PASS / FAIL |
| /admin/forum | | | | PASS / FAIL |
| /admin/payments | | | | PASS / FAIL |
| /admin/reports | | | | PASS / FAIL |
| /admin/settings | | | | PASS / FAIL |

### 8.3 Navigation-to-meaningful-content p75 (Req 7.2, target ≤ 1000 ms; 7.3 violation if > 1000 ms)

| Page | Baseline p75 (ms) | Result p75 (ms) | Δ (ms) | Result status |
|------|-------------------|-----------------|--------|---------------|
| /admin (dashboard) | | | | PASS / FAIL / VIOLATION (7.3) |
| /admin/approvals | | | | PASS / FAIL / VIOLATION (7.3) |
| /admin/alumni | | | | PASS / FAIL / VIOLATION (7.3) |
| /admin/announcements | | | | PASS / FAIL / VIOLATION (7.3) |
| /admin/events | | | | PASS / FAIL / VIOLATION (7.3) |
| /admin/forum | | | | PASS / FAIL / VIOLATION (7.3) |
| /admin/payments | | | | PASS / FAIL / VIOLATION (7.3) |
| /admin/reports | | | | PASS / FAIL / VIOLATION (7.3) |
| /admin/settings | | | | PASS / FAIL / VIOLATION (7.3) |

### 8.4 Auth-related DB round-trips per request (Req 7.4, target ≤ 1)

| Page | Baseline count | Result count | Result status |
|------|----------------|--------------|---------------|
| /admin/payments | | | PASS / FAIL |
| /admin/alumni | | | PASS / FAIL |
| /admin/approvals | | | PASS / FAIL |
| /admin/reports | | | PASS / FAIL |
| (any other admin page) | | | PASS / FAIL |

### 8.5 Sequential DB round-trips on previously-4+ pages (Req 7.5, target ≤ 2)

| Page | Baseline sequential round-trips | Result sequential round-trips | Result status |
|------|---------------------------------|-------------------------------|---------------|
| /admin/payments (was 4+) | | | PASS / FAIL |
| /admin/alumni (was 4+) | | | PASS / FAIL |
| /admin/approvals (was 4+) | | | PASS / FAIL |
| /admin/reports (was 4+) | | | PASS / FAIL |

### 8.6 Overall conclusion

> Summarize: number of pages passing 7.1, passing 7.2, any 7.3 violations, 7.4 result, 7.5 result.
> The optimization meets Requirement 7 only when every applicable cell above is `PASS` (no `FAIL`,
> no `VIOLATION (7.3)`).

---

## 9. Checklist (quick reference)

- [ ] Pointed `DIRECT_URL` at a **test/staging** database (verified host).
- [ ] Seeded ≥10,000 rows in profiles, payments, events, announcements, forum_threads (`scripts/seed-perf-data.sql`).
- [ ] Verified row counts (§2.1).
- [ ] Built with `npm run build`; served with `npm run start` (production).
- [ ] Recorded the environment table (§3) for baseline and result.
- [ ] Warmed the caches (20 discard requests/page); recorded warm vs cold separately.
- [ ] Collected ≥100 TTFB samples/page (`curl -w time_starttransfer`).
- [ ] Collected ≥100 navigation FCP samples/page (Performance API / Playwright).
- [ ] Counted auth round-trips (≤1) and sequential round-trips (≤2) via logs / `pg_stat_statements`.
- [ ] Computed p75 (§6) for each sample file.
- [ ] Recorded baseline AND result under identical conditions (§8).
- [ ] Applied the 7.3 violation rule for navigation p75 > 1000 ms.
- [ ] Cleaned up seeded data (`scripts/cleanup-perf-data.sql`) when finished.
