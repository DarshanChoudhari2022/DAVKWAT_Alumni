import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Avatar } from '@/components/shared/Avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/shared/Pagination';
import { ListSkeleton } from '@/components/shared/admin-section';
import { SectionError } from '@/components/shared/SectionError';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import {
  getListCount,
  formatCount,
  type CountResult,
  type EstimateFilter,
} from '@/lib/db/estimated-count';
import { computePagination } from '@/lib/db/pagination';
import { formatDate } from '@/lib/utils/format';
import { ApprovalActions } from './ApprovalActions';

export const metadata: Metadata = { title: 'Pending Approvals - Admin' };
const PAGE_SIZE = 20;

interface SearchParams {
  filter?: string;
  page?: string;
}

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  // Shell renders synchronously (Req 3.1, 3.5): header (title) + filter nav. The
  // "{count} alumni waiting for approval." line depends on the count, so it
  // streams inside the list region below (Req 3.2, 3.3) and never blocks the shell.
  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Pending Approvals</h1>
        </div>
        <nav
          className="flex overflow-x-auto rounded-lg border border-slate-200 bg-white p-1"
          aria-label="Filter"
        >
          {[
            { label: 'All', value: '' },
            { label: 'Today', value: 'today' },
            { label: 'This Week', value: 'week' },
            { label: 'Older', value: 'older' },
          ].map((filter) => (
            <a
              key={filter.value}
              href={
                filter.value ? `/admin/approvals?filter=${filter.value}` : '/admin/approvals'
              }
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
                (sp.filter ?? '') === filter.value
                  ? 'bg-[#0F2557] text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {filter.label}
            </a>
          ))}
        </nav>
      </header>

      <Suspense fallback={<ListSkeleton rows={20} cols={4} />}>
        <ApprovalsListRegion sp={sp} page={page} />
      </Suspense>
    </div>
  );
}

/**
 * List region (Req 3.2, 3.3, 3.4, 3.7): runs the filtered pending-profiles
 * List_Query and the row count concurrently, computes reachable pagination from
 * the (possibly estimated) count, and renders the same card list + pagination +
 * empty state as before. The "{count} alumni waiting for approval." line lives
 * here so the shell can render without awaiting the count (Req 9.3 renders the
 * approximate indicator via formatCount).
 */
async function ApprovalsListRegion({ sp, page }: { sp: SearchParams; page: number }) {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { database: supabase } = await requireAdminAccess();

    // Real list query — same select / .eq / date filter / .order / .range as
    // before, just without count:'exact' (the count is resolved separately, Req 5.1).
    let listQuery = supabase
      .from('profiles')
      .select(
        'id, full_name, email, batch_year, course, current_city, phone, created_at, avatar_url'
      )
      .eq('approval_status', 'pending');

    // Date filter feeds both the list query and the planner estimate filters so
    // the count matches the rows shown.
    const filters: EstimateFilter[] = [
      { column: 'approval_status', op: 'eq', value: 'pending' },
    ];

    if (sp.filter === 'today') {
      listQuery = listQuery.gte('created_at', startOfToday);
      filters.push({ column: 'created_at', op: 'gte', value: startOfToday });
    } else if (sp.filter === 'week') {
      listQuery = listQuery.gte('created_at', oneWeekAgo);
      filters.push({ column: 'created_at', op: 'gte', value: oneWeekAgo });
    } else if (sp.filter === 'older') {
      listQuery = listQuery.lt('created_at', oneWeekAgo);
      filters.push({ column: 'created_at', op: 'lt', value: oneWeekAgo });
    }

    // Exact-count fallback: the SAME filtered predicate with a head count. Used
    // by getListCount only when the planner estimate is unavailable (Req 5.6).
    const exactFallback = () => {
      let countQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      if (sp.filter === 'today') countQuery = countQuery.gte('created_at', startOfToday);
      else if (sp.filter === 'week') countQuery = countQuery.gte('created_at', oneWeekAgo);
      else if (sp.filter === 'older') countQuery = countQuery.lt('created_at', oneWeekAgo);

      return countQuery;
    };

    // Concurrent per-region queries (Req 3.4, 5.5): list rows + count. Ordering
    // keeps the unique tie-breaker (created_at asc, then id asc) for a total order.
    const listPromise = listQuery
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    const countPromise: Promise<CountResult> = getListCount(supabase, {
      table: 'profiles',
      filters,
      exactFallback,
    });

    const [listResult, countResult] = await Promise.all([listPromise, countPromise]);
    const pendingProfiles = listResult.data ?? [];
    const { error } = listResult;

    // Estimate only drives totalPages; reachability is preserved even when the
    // estimate is low (Req 5.2).
    const { totalPages } = computePagination({
      rowsReturned: pendingProfiles.length,
      pageSize: PAGE_SIZE,
      page,
      estimate: countResult.count,
    });

    // Preserve existing error handling: log + render an inline error Card.
    if (error) {
      console.error('[admin/approvals] failed to load pending registrations:', error);
    }

    return (
      <>
        <p className="mt-6 text-sm text-slate-500">
          {formatCount(countResult)} alumni waiting for approval.
        </p>

        <ul className="mt-6 space-y-3">
          {error && (
            <li>
              <Card className="text-center text-sm text-rose-600">
                We could not load the approval queue right now. Please refresh and try again.
              </Card>
            </li>
          )}
          {pendingProfiles.map((profile) => (
            <li key={profile.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar src={profile.avatar_url} name={profile.full_name} size="md" />
                    <div className="min-w-0">
                      <h3 className="font-medium">{profile.full_name}</h3>
                      <p className="break-all text-sm text-slate-500 sm:break-normal">{profile.email}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="primary">Batch {profile.batch_year}</Badge>
                        <Badge variant="default">{profile.course}</Badge>
                        {profile.current_city && (
                          <Badge variant="default">{profile.current_city}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Registered {formatDate(profile.created_at)}
                      </p>
                    </div>
                  </div>
                  <ApprovalActions alumniId={profile.id} alumniName={profile.full_name} />
                </div>
              </Card>
            </li>
          ))}
          {!error && pendingProfiles.length === 0 && (
            <li>
              <Card className="text-center text-sm text-slate-500">
                No pending approvals. All caught up!
              </Card>
            </li>
          )}
        </ul>

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/approvals"
          searchParams={{ filter: sp.filter }}
        />
      </>
    );
  } catch {
    return <SectionError />;
  }
}
