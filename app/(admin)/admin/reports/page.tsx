import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Calendar, CreditCard, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatsGridSkeleton } from '@/components/shared/admin-section';
import { SectionError } from '@/components/shared/SectionError';
import { Skeleton, CardSkeleton } from '@/components/shared/Skeleton';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { getApprovedProfilesCount, getPaidMembersCount } from '@/lib/cache/admin-cache';
import { getSuccessfulRevenue } from '@/lib/db/estimated-count';
import { formatINR } from '@/lib/utils/format';
import { ReportsCharts } from './ReportsCharts';

export const metadata: Metadata = { title: 'Reports & Exports - Admin' };

interface PopularThread {
  id: string;
  title: string;
  reply_count: number;
  created_at: string;
}

/**
 * Reports page shell (Req 3.1, 3.5). The heading, description, and the static
 * "Export Data" section render synchronously — the export links are static and
 * must NOT wait on any query. The heavy Aggregate_Data reads that previously
 * blocked the whole page in one 9-query `Promise.all` are now split into three
 * independent streaming regions, each in its own `Suspense` boundary (Req 3.3)
 * with region-local error handling (Req 3.7):
 *   1. Summary stats  — cached counts + EXACT monetary revenue (Req 5.3/5.4).
 *   2. Charts         — the four chart-data scans.
 *   3. Popular content — the popular-threads query.
 *
 * The auth gate runs in the layout; each region re-uses the request-scoped
 * memoized `requireAdminAccess()` to get its database client.
 */
export default function AdminReportsPage() {
  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* Shell: heading + description render synchronously. */}
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Reports & Exports</h1>
      <p className="mt-1 text-sm text-slate-500">Analytics and data exports for the portal.</p>

      {/* Summary stats region (cached counts + exact revenue). */}
      <Suspense
        fallback={<StatsGridSkeleton count={5} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" />}
      >
        <ReportsSummaryStats />
      </Suspense>

      {/* Charts region (four chart-data scans). */}
      <Suspense
        fallback={
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        }
      >
        <ReportsChartsSection />
      </Suspense>

      {/* Popular Content region. */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Popular Content</h2>
        <Suspense
          fallback={
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <PopularContent />
        </Suspense>
      </section>

      {/* Shell: static Export Data section renders synchronously (no query). */}
      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Export Data</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExportCard
            icon={Users}
            title="Alumni Directory"
            description="Export all approved alumni with contact, academic, and professional details."
            href="/api/admin/export?type=alumni&status=approved"
          />
          <ExportCard
            icon={CreditCard}
            title="Payment Records"
            description="Export all successful payments with transaction details."
            href="/api/admin/export?type=payments&status=success"
          />
          <ExportCard
            icon={Calendar}
            title="Event RSVPs"
            description="Export attendee list for a specific event."
            href="/admin/events"
            note="Go to Events -> Select event -> RSVPs -> Export"
          />
        </div>
      </section>
    </div>
  );
}

/**
 * Summary stats region — the five summary cards (Req 3.4/5.5: independent reads
 * run concurrently). Total Alumni and Paid Members come from the cached
 * Aggregate_Data helpers; Total Revenue is kept EXACT via a single aggregate
 * `amount.sum()` query (`getExactSum`, never estimated — Req 5.3/5.4); Active
 * Users (30d) is a count query with a `last_seen_at` filter; Conversion Rate is
 * derived from the counts. A failure renders a scoped error without blanking the
 * shell or other regions (Req 3.7).
 */
async function ReportsSummaryStats() {
  try {
    const { database: supabase } = await requireAdminAccess();
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [totalAlumni, paidAlumni, totalRevenue, activeRes] = await Promise.all([
      getApprovedProfilesCount(),
      getPaidMembersCount(),
      getSuccessfulRevenue(supabase),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen_at', activeSince),
    ]);

    if (activeRes.error) {
      throw activeRes.error;
    }

    const activeUsers = activeRes.count ?? 0;
    const conversionRate = totalAlumni > 0 ? ((paidAlumni / totalAlumni) * 100).toFixed(1) : '0';

    return (
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <p className="text-sm text-slate-500">Total Alumni</p>
          <p className="mt-1 font-display text-2xl font-semibold">{totalAlumni}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Paid Members</p>
          <p className="mt-1 font-display text-2xl font-semibold">{paidAlumni}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Conversion Rate</p>
          <p className="mt-1 font-display text-2xl font-semibold">{conversionRate}%</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Active Users (30d)</p>
          <p className="mt-1 font-display text-2xl font-semibold">{activeUsers}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatINR(Number(totalRevenue))}</p>
        </Card>
      </div>
    );
  } catch {
    return <SectionError />;
  }
}

/**
 * Charts region — runs the four chart-data queries concurrently (Req 3.4/5.5),
 * builds the same chart-data maps as before, and renders <ReportsCharts/>. All
 * chart data transformations are preserved exactly. try/catch → SectionError
 * (Req 3.7).
 */
async function ReportsChartsSection() {
  try {
    const { database: supabase } = await requireAdminAccess();
    const chartSince = new Date();
    chartSince.setMonth(chartSince.getMonth() - 12);
    const chartSinceIso = chartSince.toISOString();

    const [alumniByBatch, alumniByState, registrationsByMonth, paymentsByMonth] = await Promise.all([
      supabase
        .from('profiles')
        .select('batch_year')
        .eq('approval_status', 'approved')
        .order('batch_year', { ascending: true }),
      supabase.from('profiles').select('current_state').eq('approval_status', 'approved'),
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', chartSinceIso)
        .order('created_at', { ascending: true }),
      supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'success')
        .gte('created_at', chartSinceIso)
        .order('created_at', { ascending: true }),
    ]);

    if (alumniByBatch.error || alumniByState.error || registrationsByMonth.error || paymentsByMonth.error) {
      throw (
        alumniByBatch.error ??
        alumniByState.error ??
        registrationsByMonth.error ??
        paymentsByMonth.error
      );
    }

    const batchMap = new Map<number, number>();
    for (const row of alumniByBatch.data ?? []) {
      const year = (row as { batch_year: number }).batch_year;
      batchMap.set(year, (batchMap.get(year) ?? 0) + 1);
    }
    const batchChartData = Array.from(batchMap.entries())
      .map(([year, count]) => ({ year: String(year), count }))
      .slice(-20);

    const stateMap = new Map<string, number>();
    for (const row of alumniByState.data ?? []) {
      const state = (row as { current_state: string | null }).current_state ?? 'Unknown';
      stateMap.set(state, (stateMap.get(state) ?? 0) + 1);
    }
    const stateChartData = Array.from(stateMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const registrationMap = new Map<string, number>();
    for (const row of registrationsByMonth.data ?? []) {
      const month = (row as { created_at: string }).created_at.slice(0, 7);
      registrationMap.set(month, (registrationMap.get(month) ?? 0) + 1);
    }
    const registrationChartData = Array.from(registrationMap.entries())
      .map(([month, count]) => ({ month, count }))
      .slice(-12);

    const revenueMap = new Map<string, number>();
    for (const row of paymentsByMonth.data ?? []) {
      const payment = row as { amount: number; created_at: string };
      const month = payment.created_at.slice(0, 7);
      revenueMap.set(month, (revenueMap.get(month) ?? 0) + Number(payment.amount));
    }
    const paymentChartData = Array.from(revenueMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .slice(-12);

    return (
      <ReportsCharts
        batchData={batchChartData}
        stateData={stateChartData}
        registrationData={registrationChartData}
        paymentData={paymentChartData}
      />
    );
  } catch {
    return <SectionError />;
  }
}

/**
 * Popular Content region — runs the popular-threads query and renders the same
 * card list + empty state. try/catch → SectionError (Req 3.7).
 */
async function PopularContent() {
  try {
    const { database: supabase } = await requireAdminAccess();
    const { data, error } = await supabase
      .from('forum_threads')
      .select('id, title, reply_count, created_at')
      .order('reply_count', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    const popularThreads = (data ?? []) as PopularThread[];

    return (
      <div className="mt-4 space-y-3">
        {popularThreads.map((thread) => (
          <Card key={thread.id}>
            <p className="font-medium text-slate-900">{thread.title}</p>
            <p className="mt-1 text-sm text-slate-500">
              {thread.reply_count} replies - created {new Date(thread.created_at).toLocaleDateString('en-IN')}
            </p>
          </Card>
        ))}
        {popularThreads.length === 0 && (
          <Card className="text-sm text-slate-500">No forum activity yet.</Card>
        )}
      </div>
    );
  } catch {
    return <SectionError />;
  }
}

function ExportCard({
  icon: Icon,
  title,
  description,
  href,
  note,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  href: string;
  note?: string;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F2557]/5 text-[#0F2557]">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-3 font-display font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
        {note && <p className="mt-2 text-xs italic text-slate-400">{note}</p>}
      </div>
      {!note && (
        <div className="mt-4 grid gap-2 sm:flex">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <a href={href}>
              <Download className="h-4 w-4" />
              CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <a href={`${href}&format=xlsx`}>
              <Download className="h-4 w-4" />
              Excel
            </a>
          </Button>
        </div>
      )}
    </Card>
  );
}
