import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/shared/Avatar';
import { Pagination } from '@/components/shared/Pagination';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Alumni Management — Admin' };

const PAGE_SIZE = 20;

interface SearchParams {
  q?: string;
  status?: string;
  membership?: string;
  page?: string;
}

export default async function AdminAlumniPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select(
      'id, full_name, email, batch_year, course, current_city, role, approval_status, is_paid_member, is_active, created_at, avatar_url',
      { count: 'exact' }
    );

  if (sp.q) {
    query = query.or(`full_name.ilike.%${sp.q}%,email.ilike.%${sp.q}%`);
  }
  if (sp.status === 'approved') query = query.eq('approval_status', 'approved');
  if (sp.status === 'pending') query = query.eq('approval_status', 'pending');
  if (sp.status === 'rejected') query = query.eq('approval_status', 'rejected');
  if (sp.membership === 'paid') query = query.eq('is_paid_member', true);
  if (sp.membership === 'free') query = query.eq('is_paid_member', false);

  const { data: alumni, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Alumni Management</h1>
          <p className="mt-1 text-sm text-slate-500">{count ?? 0} total records.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/admin/export?type=alumni&status=${sp.status ?? ''}&q=${sp.q ?? ''}`}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </header>

      {/* Filters */}
      <form className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="search">
        <label className="lg:col-span-2">
          <span className="sr-only">Search</span>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="Search by name or email…"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            />
          </div>
        </label>
        <select
          name="status"
          defaultValue={sp.status ?? ''}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          name="membership"
          defaultValue={sp.membership ?? ''}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">All membership</option>
          <option value="paid">Paid</option>
          <option value="free">Free</option>
        </select>
        <div className="lg:col-span-4 flex gap-2">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-lg bg-[#0F2557] px-5 text-sm font-medium text-white hover:bg-[#0F2557]/90"
          >
            Apply
          </button>
          <Link href="/admin/alumni" className="flex items-center text-sm text-slate-500 hover:text-[#0F2557]">
            Clear
          </Link>
        </div>
      </form>

      {/* Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-3">Alumni</th>
              <th className="pb-2 pr-3">Batch</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Membership</th>
              <th className="pb-2 pr-3">Role</th>
              <th className="pb-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(alumni ?? []).map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="py-3 pr-3">
                  <Link
                    href={`/admin/alumni/${a.id}`}
                    className="flex items-center gap-2 hover:text-[#0F2557]"
                  >
                    <Avatar src={a.avatar_url} name={a.full_name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.full_name}</p>
                      <p className="truncate text-xs text-slate-500">{a.email}</p>
                    </div>
                  </Link>
                </td>
                <td className="py-3 pr-3">{a.batch_year}</td>
                <td className="py-3 pr-3">
                  <Badge
                    variant={
                      a.approval_status === 'approved'
                        ? 'success'
                        : a.approval_status === 'rejected'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    {a.approval_status}
                  </Badge>
                </td>
                <td className="py-3 pr-3">
                  <Badge variant={a.is_paid_member ? 'success' : 'default'}>
                    {a.is_paid_member ? 'Paid' : 'Free'}
                  </Badge>
                </td>
                <td className="py-3 pr-3 capitalize">{a.role}</td>
                <td className="py-3">{formatDate(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(alumni ?? []).length === 0 && (
          <Card className="mt-4 text-center text-sm text-slate-500">No alumni match your filters.</Card>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/alumni"
        searchParams={{ q: sp.q, status: sp.status, membership: sp.membership }}
      />
    </div>
  );
}
