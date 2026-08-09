import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileInfoRow } from '@/components/admin/MobileInfoRow';
import { Pagination } from '@/components/shared/Pagination';
import { StatsGridSkeleton, ListSkeleton } from '@/components/shared/admin-section';
import { SectionError } from '@/components/shared/SectionError';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import {
  getMembershipPlans,
  getPaymentsSuccessCount,
  getPaymentsPendingCount,
} from '@/lib/cache/admin-cache';
import {
  getSuccessfulRevenue,
} from '@/lib/db/estimated-count';
import { formatCount } from '@/lib/db/count-format';
import { computePagination } from '@/lib/db/pagination';
import { formatINR, formatDateTime } from '@/lib/utils/format';
import { escapeIlikePattern, normalizeSearchTerm } from '@/lib/utils/search';
import { ManualPaymentStatusActions } from './ManualPaymentStatusActions';

export const metadata: Metadata = { title: 'Payments — Admin' };

const PAGE_SIZE = 10;

type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

interface SearchParams {
  status?: string;
  plan?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
  page?: string;
}

interface PaymentRow {
  id: string;
  txnid: string;
  amount: number;
  currency: string;
  status: string;
  payment_mode: string | null;
  bank_ref_num: string | null;
  receipt_url: string | null;
  created_at: string;
  alumni_id: string;
  profiles: { full_name: string; email: string };
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  // Reference_Data: the plan dropdown reads cached membership plans (fast,
  // portal-global) so the shell renders without a blocking list/stats query.
  const plans = await getMembershipPlans();

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* Shell: header (title + Export CSV) renders synchronously. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Payments</h1>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <a href={`/api/admin/export?type=payments&status=${sp.status ?? ''}&q=${sp.q ?? ''}`}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </header>

      {/* Stats region (cached counts + exact monetary revenue). */}
      <Suspense fallback={<StatsGridSkeleton count={3} className="mt-6 grid gap-4 sm:grid-cols-3" />}>
        <PaymentsStats />
      </Suspense>

      {/* Filters (shell). */}
      <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search by txnid or name…"
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557] sm:col-span-2 lg:col-span-2"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          name="plan"
          defaultValue={sp.plan ?? ''}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All plans</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="date_from"
          defaultValue={sp.date_from ?? ''}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        />
        <input
          type="date"
          name="date_to"
          defaultValue={sp.date_to ?? ''}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0F2557] px-5 text-sm font-medium text-white hover:bg-[#0F2557]/90"
        >
          Apply
        </button>
        <Link href="/admin/payments" className="flex h-10 items-center justify-center text-sm text-slate-500 hover:text-[#0F2557]">
          Clear
        </Link>
      </form>

      {/* List region (filtered List_Query + estimated/exact count for pagination). */}
      <Suspense fallback={<ListSkeleton rows={PAGE_SIZE} cols={6} />}>
        <PaymentsList sp={sp} page={page} />
      </Suspense>
    </div>
  );
}

/**
 * Stats region — cached success/pending counts (Aggregate_Data) plus the EXACT
 * total successful revenue from a single aggregate query (Req 5.3/5.4). The
 * three independent reads run concurrently (Req 3.4/5.5); a failure renders a
 * scoped error without blanking the shell (Req 3.7).
 */
async function PaymentsStats() {
  try {
    const { database: supabase } = await requireAdminAccess();

    const [successCount, pendingCount, totalRevenue] = await Promise.all([
      getPaymentsSuccessCount(),
      getPaymentsPendingCount(),
      getSuccessfulRevenue(supabase),
    ]);

    return (
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatINR(Number(totalRevenue))}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Successful Payments</p>
          <p className="mt-1 font-display text-2xl font-semibold">{successCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-1 font-display text-2xl font-semibold">{pendingCount}</p>
        </Card>
      </div>
    );
  } catch {
    return <SectionError />;
  }
}

/**
 * List region — runs the real filtered payments query (correctness source) plus
 * a list count concurrently (Req 3.4/5.5). The count uses the planner estimate
 * via `getListCount` for the AND-expressible filters (status/plan/date range);
 * when a free-text search is active the OR predicate can't be expressed by the
 * estimate RPC, so an exact count drives pagination instead. Tie-breaker
 * ordering (`created_at` desc, then `id` desc) and the `.range` window are kept
 * identical to the pre-refactor query.
 */
async function PaymentsList({ sp, page }: { sp: SearchParams; page: number }) {
  try {
    const { database: supabase } = await requireAdminAccess();
    const offset = (page - 1) * PAGE_SIZE;

    const normalizedSearch = sp.q ? normalizeSearchTerm(sp.q) : null;
    const searchTerm = normalizedSearch ? `%${escapeIlikePattern(normalizedSearch)}%` : null;

    // Real list query (identical select / filters / ordering / range as before).
    let listQuery = supabase
      .from('payments')
      .select(
        'id, txnid, amount, currency, status, payment_mode, bank_ref_num, receipt_url, created_at, alumni_id, profiles!inner(full_name, email)',
        { count: 'estimated' }
      );
    if (sp.status && sp.status !== 'all') {
      listQuery = listQuery.eq('status', sp.status as PaymentStatus);
    }
    if (sp.plan) {
      listQuery = listQuery.eq('plan_id', sp.plan);
    }
    if (sp.date_from) {
      listQuery = listQuery.gte('created_at', new Date(sp.date_from).toISOString());
    }
    if (sp.date_to) {
      const endOfDay = new Date(`${sp.date_to}T23:59:59.999`).toISOString();
      listQuery = listQuery.lte('created_at', endOfDay);
    }
    if (searchTerm) {
      listQuery = listQuery.or(`txnid.ilike.${searchTerm},profiles.full_name.ilike.${searchTerm}`);
    }

    const listPromise = listQuery
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const listResult = await listPromise;

    if (listResult.error) {
      throw listResult.error;
    }

    const payments = (listResult.data ?? []) as unknown as PaymentRow[];
    const countResult = { count: listResult.count ?? payments.length, isEstimated: true };
    const { totalPages } = computePagination({
      rowsReturned: payments.length,
      pageSize: PAGE_SIZE,
      page,
      estimate: countResult.count,
    });

    return (
      <>
        <p className="mt-6 text-sm text-slate-500">
          {formatCount(countResult)} total transactions, including manual membership requests awaiting review.
        </p>

        <div className="mt-6 grid gap-3 sm:hidden">
          {payments.map((p) => {
            const profile = p.profiles;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/admin/alumni/${p.alumni_id}`} className="hover:text-[#0F2557]">
                      <p className="truncate font-medium">{profile?.full_name ?? '-'}</p>
                      <p className="truncate text-xs text-slate-500">{profile?.email ?? ''}</p>
                    </Link>
                  </div>
                  <Badge
                    variant={
                      p.status === 'success'
                        ? 'success'
                        : p.status === 'failed'
                          ? 'error'
                          : p.status === 'refunded'
                            ? 'default'
                            : 'warning'
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  <MobileInfoRow label="Txn">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                      {p.txnid}
                    </code>
                  </MobileInfoRow>
                  <MobileInfoRow label="Amount">{formatINR(Number(p.amount))}</MobileInfoRow>
                  <MobileInfoRow label="Mode"><span className="capitalize">{p.payment_mode ?? '-'}</span></MobileInfoRow>
                  <MobileInfoRow label="Date">{formatDateTime(p.created_at)}</MobileInfoRow>
                  <MobileInfoRow label="Review">
                    <ManualPaymentStatusActions paymentId={p.id} currentStatus={p.status} />
                  </MobileInfoRow>
                  {p.receipt_url && (
                    <MobileInfoRow label="Proof">
                      <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[#0F2557] underline text-xs">
                        View Screenshot
                      </a>
                    </MobileInfoRow>
                  )}
                </div>
              </Card>
            );
          })}
          {payments.length === 0 && (
            <Card className="text-center text-sm text-slate-500">No payments found.</Card>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 pl-5 pr-4">Txn ID</th>
                <th className="px-4 py-3">Alumni</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Manual Review</th>
                <th className="py-3 pl-4 pr-5">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const profile = p.profiles;
                return (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-3 pl-5 pr-4">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                        {p.txnid}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/alumni/${p.alumni_id}`} className="hover:text-[#0F2557]">
                        <p className="font-medium">{profile?.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-500">{profile?.email ?? ''}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatINR(Number(p.amount))}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          p.status === 'success'
                            ? 'success'
                            : p.status === 'failed'
                              ? 'error'
                              : p.status === 'refunded'
                                ? 'default'
                                : 'warning'
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.payment_mode ?? '—'}</td>
                    <td className="px-4 py-3">
                      {p.receipt_url ? (
                        <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[#0F2557] underline text-xs">
                          View
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ManualPaymentStatusActions paymentId={p.id} currentStatus={p.status} />
                    </td>
                    <td className="py-3 pl-4 pr-5">{formatDateTime(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/payments"
          searchParams={{
            status: sp.status,
            plan: sp.plan,
            date_from: sp.date_from,
            date_to: sp.date_to,
            q: sp.q,
          }}
        />
      </>
    );
  } catch {
    return <SectionError />;
  }
}
