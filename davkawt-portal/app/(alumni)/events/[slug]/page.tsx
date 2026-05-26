import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Users, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/format';
import { RsvpForm } from './RsvpForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('title, description')
    .eq('slug', slug)
    .single();
  return { title: data?.title ?? 'Event', description: data?.description ?? undefined };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (!event) notFound();

  const [{ data: myRsvp }, { count: goingCount }] = await Promise.all([
    supabase
      .from('event_rsvps')
      .select('id')
      .eq('event_id', event.id)
      .eq('alumni_id', user.id)
      .maybeSingle(),
    supabase
      .from('event_rsvps')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id),
  ]);

  const isPast = new Date(event.starts_at).getTime() < Date.now();
  const spotsLeft =
    event.max_attendees != null && goingCount != null ? Math.max(0, event.max_attendees - goingCount) : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]">
        <ArrowLeft aria-hidden className="h-4 w-4" /> Back to events
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isPast ? 'default' : 'warning'}>{formatDateTime(event.starts_at)}</Badge>
          <Badge variant="default" className="capitalize">{event.event_type}</Badge>
          {isPast && <Badge variant="default">Past event</Badge>}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
        <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar aria-hidden className="h-4 w-4 text-slate-400" />
            <span>{formatDateTime(event.starts_at)}{event.ends_at ? ` — ${formatDateTime(event.ends_at)}` : ''}</span>
          </div>
          {event.venue && (
            <div className="flex items-center gap-2">
              <MapPin aria-hidden className="h-4 w-4 text-slate-400" />
              <span>{event.venue}</span>
            </div>
          )}
          {event.max_attendees != null && (
            <div className="flex items-center gap-2">
              <Users aria-hidden className="h-4 w-4 text-slate-400" />
              <span>{goingCount ?? 0} going · {spotsLeft ?? 0} spots left</span>
            </div>
          )}
        </dl>
      </header>

      <Card className="mt-6 p-6 sm:p-8">
        {event.description && (
          <div className="whitespace-pre-line text-base leading-relaxed text-slate-700">
            {event.description}
          </div>
        )}
        {event.event_type === 'online' && event.online_link && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium">Join link</p>
            <a
              href={event.online_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm break-all text-[#0F2557] underline"
            >
              {event.online_link}
            </a>
          </div>
        )}
      </Card>

      {!isPast && (
        <Card className="mt-6 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">RSVP</h2>
          <RsvpForm
            eventId={event.id}
            slug={event.slug}
            hasRsvp={!!myRsvp}
            spotsLeft={spotsLeft}
          />
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/events/${event.slug}/ics`} download>
            <Download aria-hidden className="h-4 w-4" />
            Add to calendar
          </a>
        </Button>
      </div>
    </article>
  );
}
