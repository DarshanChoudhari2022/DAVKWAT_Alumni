import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/shared/Pagination';
import { CardSkeleton } from '@/components/shared/Skeleton';
import { SectionError } from '@/components/shared/SectionError';
import { formatCount } from '@/lib/db/count-format';
import { computePagination } from '@/lib/db/pagination';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Events' };

const PAGE_SIZE = 12;

interface SearchParams {
  page?: string;
  filter?: 'upcoming' | 'past';
}

/**
 * Skeleton fallback for the events list region.
 * Composes CardSkeleton in a grid matching the list layout.
 */
function EventsListSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Events page shell renders synchronously (heading + filter tabs).
 * The list region streams inside Suspense so a slow query never blocks the shell.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filter = sp.filter ?? 'upcoming';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-slate-500">Reunions, meetups, webinars and more.</p>
        </div>
        <nav className="inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Event filter">
          <Link
            href="/events?filter=upcoming"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === 'upcoming' ? 'bg-[#0F2557] text-white' : 'text-slate-600'
            }`}
          >
            Upcoming
          </Link>
          <Link
            href="/events?filter=past"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === 'past' ? 'bg-[#0F2557] text-white' : 'text-slate-600'
            }`}
          >
            Past
          </Link>
        </nav>
      </header>

      <Suspense fallback={<EventsListSkeleton />}>
        <EventsListRegion filter={filter} page={page} />
      </Suspense>
    </div>
  );
}

/**
 * Async list region: runs the filtered list query and estimated count
 * concurrently via Promise.all, computes reachable pagination, and renders
 * the event cards + pagination controls. Region errors are caught locally
 * so the page shell stays on screen (Req 2.6).
 */
async function EventsListRegion({ filter, page }: { filter: string; page: number }) {
  try {
    const offset = (page - 1) * PAGE_SIZE;
    // Middleware already verifies the session and approval status before this
    // protected route renders. RLS remains the final data-access guard.
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Fetch the page rows and exact count in the same indexed request.
    let listQuery = supabase
      .from('events')
      .select(
        'id, title, slug, starts_at, ends_at, venue, event_type, banner_image_url',
        { count: 'estimated' }
      )
      .eq('is_published', true);

    if (filter === 'upcoming') {
      listQuery = listQuery.gte('starts_at', now);
    } else {
      listQuery = listQuery.lt('starts_at', now);
    }

    // Deterministic ordering with unique tie-breaker (Req 5.1).
    // Upcoming: earliest first. Past: most recent first.
    if (filter === 'upcoming') {
      listQuery = listQuery
        .order('starts_at', { ascending: true })
        .order('id', { ascending: true });
    } else {
      listQuery = listQuery
        .order('starts_at', { ascending: false })
        .order('id', { ascending: false });
    }

    // Events is a small, indexed table. Return rows and count in one request
    // instead of waiting on an estimate RPC and a possible exact-count fallback.
    const listResult = await listQuery.range(offset, offset + PAGE_SIZE - 1);
    if (listResult.error) {
      throw listResult.error;
    }

    const events = listResult.data ?? [];
    const countResult = {
      count: listResult.count ?? events.length,
      isEstimated: true,
    };

    // Compute reachable pagination from the exact count.
    const { totalPages } = computePagination({
      rowsReturned: events.length,
      pageSize: PAGE_SIZE,
      page,
      estimate: countResult.count,
    });

    return (
      <>
        <p className="mt-6 text-sm text-slate-500">
          {formatCount(countResult)} {filter === 'upcoming' ? 'upcoming' : 'past'} events.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.slug}`}>
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <Badge variant={filter === 'upcoming' ? 'warning' : 'default'}>
                    {formatDateTime(e.starts_at)}
                  </Badge>
                  <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold">{e.title}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                    {e.event_type === 'online' ? (
                      <>
                        <Calendar aria-hidden className="h-3.5 w-3.5" />
                        Online event
                      </>
                    ) : (
                      <>
                        <MapPin aria-hidden className="h-3.5 w-3.5" />
                        {e.venue ?? 'Venue TBA'}
                      </>
                    )}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
          {events.length === 0 && (
            <li className="col-span-full">
              <Card className="text-center text-sm text-slate-500">
                {filter === 'upcoming' ? 'No upcoming events yet.' : 'No past events.'}
              </Card>
            </li>
          )}
        </ul>

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/events"
          searchParams={{ filter }}
        />
      </>
    );
  } catch {
    return <SectionError title="Couldn't load events." />;
  }
}
