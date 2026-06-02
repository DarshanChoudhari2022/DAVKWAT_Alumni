import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, Pin, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MobileInfoRow } from '@/components/admin/MobileInfoRow';
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
import { AnnouncementActions } from './AnnouncementActions';

export const metadata: Metadata = { title: 'Manage Announcements — Admin' };

const PAGE_SIZE = 10;

interface SearchParams {
  page?: string;
  status?: string;
}

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  // Shell renders synchronously (Req 3.1, 3.5): header + filter nav. The dynamic
  // "{count} total announcements." line and the list stream inside the list
  // region below so a slow/failed count never blocks the shell (Req 3.2, 3.3).
  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Announcements</h1>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/admin/announcements/new">
            <Plus className="h-4 w-4" />
            New Announcement
          </Link>
        </Button>
      </header>

      {/* Filters */}
      <nav className="mt-6 flex overflow-x-auto rounded-lg border border-slate-200 bg-white p-1" aria-label="Filter">
        {[
          { label: 'All', value: '' },
          { label: 'Published', value: 'published' },
          { label: 'Scheduled', value: 'scheduled' },
          { label: 'Drafts', value: 'draft' },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/announcements?status=${f.value}` : '/admin/announcements'}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
              (sp.status ?? '') === f.value
                ? 'bg-[#0F2557] text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <Suspense fallback={<ListSkeleton rows={10} cols={4} />}>
        <AnnouncementsListRegion sp={sp} page={page} />
      </Suspense>
    </div>
  );
}

/**
 * List region (Req 3.2, 3.3, 3.4, 3.7): runs the filtered List_Query and the row
 * count concurrently, computes reachable pagination from the (possibly estimated)
 * count, and renders the same mobile cards + desktop table + pagination as before.
 * The "{count} total announcements." line lives here so the shell can render
 * without awaiting the count.
 */
async function AnnouncementsListRegion({ sp, page }: { sp: SearchParams; page: number }) {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const { database: supabase } = await requireAdminAccess();
    const now = new Date().toISOString();

    // Real list query — select/.eq/.or/.not/.gt/.order/.range identical to
    // before, just without count:'exact' (the count is resolved separately,
    // Req 5.1).
    let listQuery = supabase
      .from('announcements')
      .select(
        'id, title, slug, is_pinned, is_published, published_at, scheduled_for, created_at, author_id, profiles(full_name)'
      );

    if (sp.status === 'published') {
      listQuery = listQuery.eq('is_published', true).or(`scheduled_for.is.null,scheduled_for.lte.${now}`);
    }
    if (sp.status === 'draft') listQuery = listQuery.eq('is_published', false);
    if (sp.status === 'scheduled') {
      listQuery = listQuery.eq('is_published', true).not('scheduled_for', 'is', null).gt('scheduled_for', now);
    }

    // Exact-count fallback: the SAME filtered predicate with a head count. Used
    // as getListCount's fallback and directly for the published/scheduled
    // filters (their OR/NOT predicates can't be expressed by the estimate RPC).
    const exactCountFallback = () => {
      let countQuery = supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true });

      if (sp.status === 'published') {
        countQuery = countQuery.eq('is_published', true).or(`scheduled_for.is.null,scheduled_for.lte.${now}`);
      }
      if (sp.status === 'draft') countQuery = countQuery.eq('is_published', false);
      if (sp.status === 'scheduled') {
        countQuery = countQuery.eq('is_published', true).not('scheduled_for', 'is', null).gt('scheduled_for', now);
      }
      return countQuery;
    };

    // Only the all-filter (no predicate) and the draft filter are simply
    // expressible AND filters the planner-estimate RPC can plan. The published
    // and scheduled filters rely on OR/NOT predicates the RPC can't express, so
    // they fall back to an exact count directly.
    const canEstimate = !sp.status || sp.status === 'draft';
    const filters: EstimateFilter[] = [];
    if (sp.status === 'draft') filters.push({ column: 'is_published', op: 'is_false' });

    // Concurrent per-region queries (Req 3.4, 5.5): list rows + count.
    const listPromise = listQuery
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const countPromise: Promise<CountResult> = canEstimate
      ? getListCount(supabase, { table: 'announcements', filters, exactFallback: exactCountFallback })
      : Promise.resolve(exactCountFallback()).then(({ count }) => ({
          count: count ?? 0,
          isEstimated: false,
        }));

    const [listResult, countResult] = await Promise.all([listPromise, countPromise]);
    const data = listResult.data ?? [];

    // Estimate only drives totalPages; reachability is preserved even when the
    // estimate is low (Req 5.2).
    const { totalPages } = computePagination({
      rowsReturned: data.length,
      pageSize: PAGE_SIZE,
      page,
      estimate: countResult.count,
    });

    return (
      <>
        <p className="mt-6 text-sm text-slate-500">{formatCount(countResult)} total announcements.</p>

        <div className="mt-6 grid gap-3 sm:hidden">
          {data.map((a) => {
            const authorName =
              a.profiles && !Array.isArray(a.profiles)
                ? (a.profiles as { full_name: string }).full_name
                : 'Unknown';
            const displayDate = a.scheduled_for
              ? formatDate(a.scheduled_for)
              : a.published_at
                ? formatDate(a.published_at)
                : formatDate(a.created_at);
            const status =
              a.is_published && a.scheduled_for && new Date(a.scheduled_for).getTime() > Date.now()
                ? 'Scheduled'
                : a.is_published
                  ? 'Published'
                  : 'Draft';

            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {a.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                      <p className="line-clamp-2 font-medium">{a.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">by {authorName}</p>
                  </div>
                  {status === 'Scheduled' ? (
                    <Badge variant="warning">Scheduled</Badge>
                  ) : status === 'Published' ? (
                    <Badge variant="success">Published</Badge>
                  ) : (
                    <Badge variant="warning">Draft</Badge>
                  )}
                </div>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                  <MobileInfoRow label="Date">{displayDate}</MobileInfoRow>
                  <div className="flex justify-end">
                    <AnnouncementActions id={a.id} isPublished={a.is_published} isPinned={a.is_pinned} />
                  </div>
                </div>
              </Card>
            );
          })}
          {data.length === 0 && (
            <Card className="text-center text-sm text-slate-500">No announcements found.</Card>
          )}
        </div>

        <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3">Title</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => {
                const authorName =
                  a.profiles && !Array.isArray(a.profiles)
                    ? (a.profiles as { full_name: string }).full_name
                    : 'Unknown';
                return (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        {a.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{a.title}</p>
                          <p className="text-xs text-slate-400">by {authorName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      {a.is_published && a.scheduled_for && new Date(a.scheduled_for).getTime() > Date.now() ? (
                        <Badge variant="warning">Scheduled</Badge>
                      ) : a.is_published ? (
                        <Badge variant="success">
                          <Eye className="mr-1 h-3 w-3" />Published
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <EyeOff className="mr-1 h-3 w-3" />Draft
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-slate-500">
                      {a.scheduled_for ? formatDate(a.scheduled_for) : a.published_at ? formatDate(a.published_at) : formatDate(a.created_at)}
                    </td>
                    <td className="py-3 text-right">
                      <AnnouncementActions
                        id={a.id}
                        isPublished={a.is_published}
                        isPinned={a.is_pinned}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/announcements"
          searchParams={{ status: sp.status }}
        />
      </>
    );
  } catch {
    return <SectionError />;
  }
}
