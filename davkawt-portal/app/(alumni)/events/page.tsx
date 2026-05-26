import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/shared/Pagination';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Events' };

const PAGE_SIZE = 12;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: 'upcoming' | 'past' }>;
}) {
  const sp = await searchParams;
  const filter = sp.filter ?? 'upcoming';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const now = new Date().toISOString();

  let q = supabase
    .from('events')
    .select('id, title, slug, starts_at, ends_at, venue, event_type, banner_image_url', { count: 'exact' })
    .eq('is_published', true);

  if (filter === 'upcoming') {
    q = q.gte('starts_at', now).order('starts_at', { ascending: true });
  } else {
    q = q.lt('starts_at', now).order('starts_at', { ascending: false });
  }

  const { data, count } = await q.range(offset, offset + PAGE_SIZE - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

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

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((e) => (
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
        {(data ?? []).length === 0 && (
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
    </div>
  );
}
