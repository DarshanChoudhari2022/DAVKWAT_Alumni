import type { Metadata } from 'next';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/shared/Pagination';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { formatINR, formatDateTime } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Payments — Admin' };

const PAGE_SIZE = 10;

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
  const offset = (page - 1) * PAGE_SIZE;

  const { database: supabase } = await requireAdminAccess();
  const { data: plans } = await supabase
    .from('membership_plans')
    .select('id, name')
    .order('amount', { ascending: true });

  let query = supabase
    .from('payments')
    .select(
      'id, txnid, amount, currency, status, payment_mode, bank_ref_num, created_at, alumni_id, profiles!inner(full_name, email)',
      { count: 'exact' }
    );

  if (sp.status && sp.status !== 'all') {
    query = query.eq('status', sp.status as 'pending' | 'success' | 'failed' | 'refunded');
  }
  if (sp.plan) {
    query = query.eq('plan_id', sp.plan);
  }
  if (sp.date_from) {
    query = query.gte('created_at', new Date(sp.date_from).toISOString());
  }
  if (sp.date_to) {
    const endOfDay = new Date(`${sp.date_to}T23:59:59.999`);
    query = query.lte('created_at', endOfDay.toISOString());
  }
  if (sp.q) {
    query = query.or(`txnid.ilike.%${sp.q}%,profiles.full_name.ilike.%${sp.q}%`);
  }

  const { data: payments, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Stats
  const [successRes, totalAmtRes, pendingRes] = await Promise.all([
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'success'),
    supabase.from('payments').select('amount').eq('status', 'success'),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const totalRevenue = (totalAmtRes.data ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-1 text-sm text-slate-500">
            {count ?? 0} total transactions, including manual membership requests awaiting review.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/admin/export?type=payments&status=${sp.status ?? ''}&q=${sp.q ?? ''}`}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </header>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatINR(totalRevenue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Successful Payments</p>
          <p className="mt-1 font-display text-2xl font-semibold">{successRes.count ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-1 font-display text-2xl font-semibold">{pendingRes.count ?? 0}</p>
        </Card>
      </div>

      {/* Filters */}
      <form className="mt-6 flex flex-wrap gap-3" role="search">
        <input
          type="search"
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Search by txnid or name…"
          className="h-10 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
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
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All plans</option>
          {(plans ?? []).map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="date_from"
          defaultValue={sp.date_from ?? ''}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        />
        <input
          type="date"
          name="date_to"
          defaultValue={sp.date_to ?? ''}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center rounded-lg bg-[#0F2557] px-5 text-sm font-medium text-white hover:bg-[#0F2557]/90"
        >
          Apply
        </button>
        <Link href="/admin/payments" className="flex items-center text-sm text-slate-500 hover:text-[#0F2557]">
          Clear
        </Link>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-3">Txn ID</th>
              <th className="pb-2 pr-3">Alumni</th>
              <th className="pb-2 pr-3">Amount</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Mode</th>
              <th className="pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {((payments ?? []) as unknown as PaymentRow[]).map((p) => {
              const profile = p.profiles;
              return (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                      {p.txnid}
                    </code>
                  </td>
                  <td className="py-3 pr-3">
                    <Link href={`/admin/alumni/${p.alumni_id}`} className="hover:text-[#0F2557]">
                      <p className="font-medium">{profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-slate-500">{profile?.email ?? ''}</p>
                    </Link>
                  </td>
                  <td className="py-3 pr-3 font-medium">{formatINR(Number(p.amount))}</td>
                  <td className="py-3 pr-3">
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
                  <td className="py-3 pr-3 capitalize">{p.payment_mode ?? '—'}</td>
                  <td className="py-3">{formatDateTime(p.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(payments ?? []).length === 0 && (
          <Card className="mt-4 text-center text-sm text-slate-500">No payments found.</Card>
        )}
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
    </div>
  );
}
