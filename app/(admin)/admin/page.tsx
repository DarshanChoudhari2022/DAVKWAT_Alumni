import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Users, UserCheck, CreditCard, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MobileInfoRow } from '@/components/admin/MobileInfoRow';
import { CardSkeleton, StatCardSkeleton, TableRowSkeleton } from '@/components/shared/Skeleton';
import { SectionError } from '@/components/shared/SectionError';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import {
  getApprovedProfilesCount,
  getPaidMembersCount,
  getPendingProfilesCount,
  getUpcomingPublishedEventsCount,
} from '@/lib/cache/admin-cache';
import { getSuccessfulRevenue } from '@/lib/db/estimated-count';
import { formatINR, formatDate } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Admin Dashboard' };

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Overview of the DAVKAWT Alumni Portal.</p>

      <Suspense fallback={<StatsGridFallback />}>
        <DashboardStats />
      </Suspense>

      <section className="mt-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-xl font-semibold">Recent Registrations</h2>
          <Link href="/admin/approvals" className="text-sm text-[#0F2557] hover:underline">
            View all &rarr;
          </Link>
        </div>
        <Suspense fallback={<RecentRegistrationsFallback />}>
          <RecentRegistrationsTable />
        </Suspense>
      </section>
    </div>
  );
}

async function DashboardStats() {
  try {
    const { database: supabase } = await requireAdminAccess();

    // Stat counts are served from the cache layer (Aggregate_Data, ≤120s); the
    // monetary revenue total stays EXACT via `getSuccessfulRevenue` (Req 5.4),
    // which uses the aggregate query when allowed and falls back to a paged sum
    // when PostgREST aggregates are disabled. All reads run concurrently in a
    // single batch (Req 3.4, 5.5).
    const [totalAlumni, pendingApprovals, paidMembers, revenue, upcomingEvents] =
      await Promise.all([
        getApprovedProfilesCount(),
        getPendingProfilesCount(),
        getPaidMembersCount(),
        getSuccessfulRevenue(supabase),
        getUpcomingPublishedEventsCount(),
      ]);

    return (
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={Users}
          label="Total Alumni"
          value={String(totalAlumni)}
          href="/admin/alumni"
        />
        <StatCard
          icon={UserCheck}
          label="Pending Approvals"
          value={String(pendingApprovals)}
          href="/admin/approvals"
          highlight={pendingApprovals > 0}
        />
        <StatCard
          icon={CreditCard}
          label="Paid Members"
          value={String(paidMembers)}
          href="/admin/payments"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={formatINR(revenue)}
          href="/admin/payments"
        />
        <StatCard
          icon={CalendarDays}
          label="Upcoming Events"
          value={String(upcomingEvents)}
          href="/admin/events?filter=upcoming"
        />
      </div>
    );
  } catch {
    return <SectionError />;
  }
}

async function RecentRegistrationsTable() {
  const { database: supabase } = await requireAdminAccess();
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, batch_year, course, approval_status, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(8);

  return (
    <>
    <div className="mt-4 grid gap-3 sm:hidden">
      {(data ?? []).map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{r.full_name}</p>
              <p className="mt-0.5 text-xs text-slate-500">Registered {formatDate(r.created_at)}</p>
            </div>
            <Badge
              variant={
                r.approval_status === 'approved'
                  ? 'success'
                  : r.approval_status === 'rejected'
                    ? 'error'
                    : 'warning'
              }
            >
              {r.approval_status}
            </Badge>
          </div>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
            <MobileInfoRow label="Batch">{r.batch_year}</MobileInfoRow>
            <MobileInfoRow label="Course">{r.course}</MobileInfoRow>
          </div>
        </Card>
      ))}
    </div>

    <div className="mt-4 hidden overflow-x-auto sm:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-4">Name</th>
            <th className="pb-2 pr-4">Batch</th>
            <th className="pb-2 pr-4">Course</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2">Registered</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="py-3 pr-4 font-medium">{r.full_name}</td>
              <td className="py-3 pr-4">{r.batch_year}</td>
              <td className="py-3 pr-4">{r.course}</td>
              <td className="py-3 pr-4">
                <Badge
                  variant={
                    r.approval_status === 'approved'
                      ? 'success'
                      : r.approval_status === 'rejected'
                        ? 'error'
                        : 'warning'
                  }
                >
                  {r.approval_status}
                </Badge>
              </td>
              <td className="py-3">{formatDate(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

function StatsGridFallback() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
  );
}

function RecentRegistrationsFallback() {
  return (
    <>
      <div className="mt-4 grid gap-3 sm:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <tbody>
            {Array.from({ length: 8 }).map((_, index) => (
              <TableRowSkeleton key={index} cols={5} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  highlight = false,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={`transition-all hover:-translate-y-0.5 hover:shadow-md ${
          highlight ? 'border-rose-200 bg-rose-50/50' : ''
        }`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F2557]/5 text-[#0F2557]">
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-4 font-display text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
      </Card>
    </Link>
  );
}
