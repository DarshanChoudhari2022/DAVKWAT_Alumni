import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileInfoRow } from '@/components/admin/MobileInfoRow';
import { Avatar } from '@/components/shared/Avatar';
import { Pagination } from '@/components/shared/Pagination';
import { ListSkeleton } from '@/components/shared/admin-section';
import { SectionError } from '@/components/shared/SectionError';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { formatCount } from '@/lib/db/count-format';
import { computePagination } from '@/lib/db/pagination';
import { formatDate } from '@/lib/utils/format';
import { escapeIlikePattern, normalizeSearchTerm } from '@/lib/utils/search';
import { DeleteRejectedAlumniButton } from './DeleteRejectedAlumniButton';

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

  // Shell renders synchronously (Req 3.1, 3.5): header + filter form. The
  // dynamic "{count} total records" line and the list stream inside the list
  // region below so a slow/failed count never blocks the shell (Req 3.2, 3.3).
  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Alumni Management</h1>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <a
            href={`/api/admin/export?type=alumni&status=${sp.status ?? ''}&membership=${sp.membership ?? ''}&q=${sp.q ?? ''}`}
          >
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
          <option value="free">Unpaid</option>
        </select>
        <div className="flex flex-col gap-2 sm:flex-row lg:col-span-4">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0F2557] px-5 text-sm font-medium text-white hover:bg-[#0F2557]/90"
          >
            Apply
          </button>
          <Link href="/admin/alumni" className="flex h-10 items-center justify-center text-sm text-slate-500 hover:text-[#0F2557] sm:h-auto">
            Clear
          </Link>
        </div>
      </form>

      <Suspense fallback={<ListSkeleton rows={20} cols={6} />}>
        <AlumniListRegion sp={sp} page={page} />
      </Suspense>
    </div>
  );
}

/**
 * List region (Req 3.2, 3.3, 3.4, 3.7): runs the filtered List_Query and the
 * row count concurrently, computes reachable pagination from the (possibly
 * estimated) count, and renders the same mobile cards + desktop table +
 * pagination as before. The "{count} total records" line lives here so the
 * shell can render without awaiting the count.
 */
async function AlumniListRegion({ sp, page }: { sp: SearchParams; page: number }) {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const adminAccess = await requireAdminAccess();
    const supabase = adminAccess.database;
    const canDeleteAlumni = adminAccess.role === 'super_admin';

    // Real list query — select/.or/.eq/.order/.range identical to before, just
    // without count:'exact' (the count is resolved separately, Req 5.1).
    let listQuery = supabase
      .from('profiles')
      .select(
        'id, full_name, email, batch_year, course, current_city, role, approval_status, is_paid_member, is_active, created_at, avatar_url',
        { count: 'exact' }
      );

    // AND-able filters run through indexed columns (Req 6.1, 6.2) and also feed
    // the planner estimate. The free-text `q` is an OR across two columns the
    // estimate RPC can't express, so it is omitted from the estimate filters.
    // Normalize the search term once; the resulting ilike pattern (or null) is
    // reused by both the list query and the exact-count fallback.
    const search = sp.q ? normalizeSearchTerm(sp.q) : null;
    const searchPattern = search ? `%${escapeIlikePattern(search)}%` : null;
    if (searchPattern) {
      listQuery = listQuery.or(`full_name.ilike.${searchPattern},email.ilike.${searchPattern}`);
    }
    if (sp.status === 'approved') {
      listQuery = listQuery.eq('approval_status', 'approved');
    }
    if (sp.status === 'pending') {
      listQuery = listQuery.eq('approval_status', 'pending');
    }
    if (sp.status === 'rejected') {
      listQuery = listQuery.eq('approval_status', 'rejected');
    }
    if (sp.membership === 'paid') {
      listQuery = listQuery.eq('is_paid_member', true);
    }
    if (sp.membership === 'free') {
      listQuery = listQuery.eq('is_paid_member', false);
    }

    const listPromise = listQuery
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const listResult = await listPromise;
    if (listResult.error) throw listResult.error;
    const alumni = listResult.data ?? [];
    const countResult = { count: listResult.count ?? alumni.length, isEstimated: false };

    // Estimate only drives totalPages; reachability is preserved even when the
    // estimate is low (Req 5.2).
    const { totalPages } = computePagination({
      rowsReturned: alumni.length,
      pageSize: PAGE_SIZE,
      page,
      estimate: countResult.count,
    });

    return (
      <>
        <p className="mt-6 text-sm text-slate-500">{formatCount(countResult)} total records.</p>

        <div className="mt-6 grid gap-3 sm:hidden">
          {alumni.map((a) => (
            <Link key={a.id} href={`/admin/alumni/${a.id}`}>
              <Card className="p-4 transition-all active:scale-[0.99]">
                <div className="flex items-start gap-3">
                  <Avatar src={a.avatar_url} name={a.full_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.full_name}</p>
                    <p className="truncate text-xs text-slate-500">{a.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
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
                      <Badge variant={a.is_paid_member ? 'success' : 'default'}>
                        {a.is_paid_member ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  <MobileInfoRow label="Batch">{a.batch_year}</MobileInfoRow>
                  <MobileInfoRow label="Course">{a.course}</MobileInfoRow>
                  <MobileInfoRow label="Role"><span className="capitalize">{a.role}</span></MobileInfoRow>
                  <MobileInfoRow label="Joined">{formatDate(a.created_at)}</MobileInfoRow>
                </div>
              </Card>
            </Link>
          ))}
          {alumni.length === 0 && (
            <Card className="text-center text-sm text-slate-500">No alumni match your filters.</Card>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 pl-5 pr-4">Alumni</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Membership</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                {canDeleteAlumni && <th className="py-3 pl-4 pr-5">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {alumni.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-3 pl-5 pr-4">
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
                  <td className="px-4 py-3">{a.batch_year}</td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <Badge variant={a.is_paid_member ? 'success' : 'default'}>
                      {a.is_paid_member ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 capitalize">{a.role}</td>
                  <td className="px-4 py-3">{formatDate(a.created_at)}</td>
                  {canDeleteAlumni && (
                    <td className="py-3 pl-4 pr-5">
                      {a.role !== 'super_admin' ? (
                        <DeleteRejectedAlumniButton alumniId={a.id} />
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/alumni"
          searchParams={{ q: sp.q, status: sp.status, membership: sp.membership }}
        />
      </>
    );
  } catch {
    return <SectionError />;
  }
}
