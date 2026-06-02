import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, MapPin, Calendar, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/shared/Pagination';
import { ListSkeleton } from '@/components/shared/admin-section';
import { SectionError } from '@/components/shared/SectionError';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import {
  getListCount,
  formatCount,
  type EstimateFilter,
} from '@/lib/db/estimated-count';
import { computePagination } from '@/lib/db/pagination';
import { formatDateTime } from '@/lib/utils/format';
import { EventActions } from './EventActions';

export const metadata: Metadata = { title: 'Manage Events — Admin' };

const PAGE_SIZE = 10;

interface SearchParams {
  page?: string;
  filter?: string;
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filter = sp.filter ?? 'all';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  // Shell renders synchronously (Req 3.1, 3.5): header + filter nav. The dynamic
  // "{count} total events." line and the list stream inside the list region
  // below so a slow/failed count never blocks the shell (Req 3.2, 3.3).
  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Events</h1>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4" />
            New Event
          </Link>
        </Button>
      </header>

      <nav className="mt-6 flex overflow-x-auto rounded-lg border border-slate-200 bg-white p-1" aria-label="Filter">
        {[
          { label: 'All', value: 'all' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Past', value: 'past' },
          { label: 'Drafts', value: 'draft' },
        ].map((f) => (
          <Link
            key={f.value}
            href={`/admin/events?filter=${f.value}`}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-[#0F2557] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <Suspense fallback={<ListSkeleton rows={10} cols={1} />}>
        <EventsListRegion filter={filter} page={page} />
      </Suspense>
    </div>
  );
}

/**
 * List region (Req 3.2, 3.3, 3.4, 3.7): runs the filtered List_Query and the row
 * count concurrently, then fetches the dependent RSVP counts (which need the
 * returned event ids), computes reachable pagination from the (possibly
 * estimated) count, and renders the same card list + pagination as before. The
 * "{count} total events." line lives here so the shell can render without
 * awaiting the count.
 */
async function EventsListRegion({ filter, page }: { filter: string; page: number }) {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    const { database: supabase } = await requireAdminAccess();
    const now = new Date().toISOString();

    // Real list query — select/.gte/.lt/.eq/.order/.range identical to before,
    // just without count:'exact' (the count is resolved separately, Req 5.1).
    let listQuery = supabase
      .from('events')
      .select('id, title, slug, starts_at, ends_at, venue, event_type, is_published, max_attendees');

    if (filter === 'upcoming') listQuery = listQuery.gte('starts_at', now);
    if (filter === 'past') listQuery = listQuery.lt('starts_at', now);
    if (filter === 'draft') listQuery = listQuery.eq('is_published', false);

    // Exact-count fallback: the SAME filtered predicate with a head count. Used
    // as getListCount's fallback.
    const exactCountFallback = () => {
      let countQuery = supabase
        .from('events')
        .select('id', { count: 'exact', head: true });

      if (filter === 'upcoming') countQuery = countQuery.gte('starts_at', now);
      if (filter === 'past') countQuery = countQuery.lt('starts_at', now);
      if (filter === 'draft') countQuery = countQuery.eq('is_published', false);
      return countQuery;
    };

    // All filters here are simply-expressible AND predicates the planner-estimate
    // RPC can plan; 'all' estimates the whole table with no filters.
    const filters: EstimateFilter[] = [];
    if (filter === 'upcoming') filters.push({ column: 'starts_at', op: 'gte', value: now });
    if (filter === 'past') filters.push({ column: 'starts_at', op: 'lt', value: now });
    if (filter === 'draft') filters.push({ column: 'is_published', op: 'is_false' });

    // Concurrent per-region queries (Req 3.4, 5.5): list rows + count.
    const listPromise = listQuery
      .order('starts_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    const countPromise = getListCount(supabase, {
      table: 'events',
      filters,
      exactFallback: exactCountFallback,
    });

    const [listResult, countResult] = await Promise.all([listPromise, countPromise]);
    const events = listResult.data ?? [];

    // RSVP counts depend on the returned event ids, so they run after the list
    // query resolves (secondary query preserved from the original page).
    const eventIds = events.map((e) => e.id);
    const { data: rsvps } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .in('event_id', eventIds.length > 0 ? eventIds : ['__none__']);

    const rsvpCounts = new Map<string, number>();
    for (const r of rsvps ?? []) {
      rsvpCounts.set(r.event_id, (rsvpCounts.get(r.event_id) ?? 0) + 1);
    }

    // Estimate only drives totalPages; reachability is preserved even when the
    // estimate is low (Req 5.2).
    const { totalPages } = computePagination({
      rowsReturned: events.length,
      pageSize: PAGE_SIZE,
      page,
      estimate: countResult.count,
    });

    return (
      <>
        <p className="mt-6 text-sm text-slate-500">{formatCount(countResult)} total events.</p>

        <ul className="mt-6 space-y-3">
          {events.map((e) => {
            const rsvpCount = rsvpCounts.get(e.id) ?? 0;
            const isPast = new Date(e.starts_at) < new Date();
            return (
              <li key={e.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!e.is_published && <Badge variant="warning">Draft</Badge>}
                        {isPast && <Badge variant="default">Past</Badge>}
                        <Badge variant="primary" className="capitalize">{e.event_type}</Badge>
                      </div>
                      <h3 className="mt-1.5 font-display text-lg font-semibold">{e.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateTime(e.starts_at)}
                        </span>
                        {e.venue && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {e.venue}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {rsvpCount} RSVPs
                          {e.max_attendees ? ` / ${e.max_attendees}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end sm:block">
                      <EventActions
                        id={e.id}
                        slug={e.slug}
                        isPublished={e.is_published}
                      />
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
          {events.length === 0 && (
            <li><Card className="text-center text-sm text-slate-500">No events found.</Card></li>
          )}
        </ul>

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/events"
          searchParams={{ filter }}
        />
      </>
    );
  } catch {
    return <SectionError />;
  }
}
