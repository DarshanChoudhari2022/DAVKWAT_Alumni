import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, MapPin, Calendar, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/shared/Pagination';
import { requireAdminAccess } from '@/lib/auth/admin-access';
import { formatDateTime } from '@/lib/utils/format';
import { EventActions } from './EventActions';

export const metadata: Metadata = { title: 'Manage Events — Admin' };

const PAGE_SIZE = 10;

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter ?? 'all';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { database: supabase } = await requireAdminAccess();
  const now = new Date().toISOString();

  let query = supabase
    .from('events')
    .select(
      'id, title, slug, starts_at, ends_at, venue, event_type, is_published, max_attendees',
      { count: 'exact' }
    );

  if (filter === 'upcoming') query = query.gte('starts_at', now);
  if (filter === 'past') query = query.lt('starts_at', now);
  if (filter === 'draft') query = query.eq('is_published', false);

  const { data: events, count } = await query
    .order('starts_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Fetch RSVP counts
  const eventIds = (events ?? []).map((e) => e.id);
  const { data: rsvps } = await supabase
    .from('event_rsvps')
    .select('event_id')
    .in('event_id', eventIds.length > 0 ? eventIds : ['__none__']);

  const rsvpCounts = new Map<string, number>();
  for (const r of rsvps ?? []) {
    rsvpCounts.set(r.event_id, (rsvpCounts.get(r.event_id) ?? 0) + 1);
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Events</h1>
          <p className="mt-1 text-sm text-slate-500">{count ?? 0} total events.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/events/new">
            <Plus className="h-4 w-4" />
            New Event
          </Link>
        </Button>
      </header>

      <nav className="mt-6 inline-flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Filter">
        {[
          { label: 'All', value: 'all' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Past', value: 'past' },
          { label: 'Drafts', value: 'draft' },
        ].map((f) => (
          <Link
            key={f.value}
            href={`/admin/events?filter=${f.value}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-[#0F2557] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      <ul className="mt-6 space-y-3">
        {(events ?? []).map((e) => {
          const rsvpCount = rsvpCounts.get(e.id) ?? 0;
          const isPast = new Date(e.starts_at) < new Date();
          return (
            <li key={e.id}>
              <Card>
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
                  <EventActions
                    id={e.id}
                    slug={e.slug}
                    isPublished={e.is_published}
                  />
                </div>
              </Card>
            </li>
          );
        })}
        {(events ?? []).length === 0 && (
          <li><Card className="text-center text-sm text-slate-500">No events found.</Card></li>
        )}
      </ul>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/events"
        searchParams={{ filter }}
      />
    </div>
  );
}
