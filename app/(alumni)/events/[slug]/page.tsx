/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/format';
import { RsvpForm } from './RsvpForm';
import { GuestRsvpForm } from '../GuestRsvpForm';
import { ShareButtons } from './ShareButtons';
import { APP_URL } from '@/lib/resend/client';

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
    .eq('is_published', true)
    .single();
  if (!data) notFound();
  return { title: data?.title ?? 'Event', description: data?.description ?? undefined };
}

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  approval_status: string;
  batch_year: number;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Public route: event data and the optional session lookup are independent,
  // so run them together instead of serializing the page on two round trips.
  const [eventResult, userResult] = await Promise.all([
    supabase
      .from('events')
      .select(
        'id, title, slug, description, event_type, venue, online_link, banner_image_url, starts_at, ends_at, registration_deadline, max_attendees, is_published'
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .single(),
    supabase.auth.getUser(),
  ]);
  const event = eventResult.data;

  if (!event) notFound();

  const userId = userResult.data.user?.id ?? null;
  const [profileResult, myRsvpResult, goingCountResult] = await Promise.all([
    userId
      ? supabase
          .from('profiles')
          .select('id, full_name, phone, approval_status, batch_year')
          .eq('id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    userId
      ? supabase
          .from('event_rsvps')
          .select('id')
          .eq('event_id', event.id)
          .eq('alumni_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    event.max_attendees != null
      ? supabase
          .from('event_rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id)
      : Promise.resolve({ count: null }),
  ]);

  const profile = profileResult.data as UserProfile | null;
  const myRsvp = myRsvpResult.data;
  const goingCount = goingCountResult.count;

  const isPast = new Date(event.starts_at).getTime() < Date.now();
  const isRegistrationClosed =
    isPast ||
    (event.registration_deadline != null &&
      new Date(event.registration_deadline).getTime() < Date.now());
  const spotsLeft =
    event.max_attendees != null && goingCount != null
      ? Math.max(0, event.max_attendees - goingCount)
      : null;

  const eventUrl = `${APP_URL}/events/${event.slug}`;

  const isApproved = profile && profile.approval_status === 'approved';

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" /> Back to events
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isPast ? 'default' : 'warning'}>{formatDateTime(event.starts_at)}</Badge>
          <Badge variant="default" className="capitalize">
            {event.event_type}
          </Badge>
          {isPast && <Badge variant="default">Past event</Badge>}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {event.title}
        </h1>
        <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar aria-hidden className="h-4 w-4 text-slate-400" />
            <span>
              {formatDateTime(event.starts_at)}
              {event.ends_at ? ` - ${formatDateTime(event.ends_at)}` : ''}
            </span>
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
              <span>
                {goingCount ?? 0} going - {spotsLeft ?? 0} spots left
              </span>
            </div>
          )}
        </dl>
      </header>

      <Card className="mt-6 p-6 sm:p-8">
        {event.banner_image_url && (
          <img
            src={event.banner_image_url}
            alt={event.title}
            className="mb-6 h-auto w-full rounded-2xl border border-slate-200 object-cover"
          />
        )}
        {event.description && (
          <div className="whitespace-pre-line text-base leading-relaxed text-slate-700">
            {event.description}
          </div>
        )}
        {event.event_type !== 'in_person' && event.online_link && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium">Join link</p>
            <a
              href={event.online_link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all text-sm text-[#0F2557] underline"
            >
              {event.online_link}
            </a>
          </div>
        )}
      </Card>

      {!isPast && (
        <Card className="mt-6 p-6 sm:p-8 border-slate-200">
          {/* STATE 1: Approved alumni/faculty profile -> Render RSVP Form */}
          {userId && isApproved && (
            <div>
              <h2 className="font-display text-xl font-semibold">RSVP</h2>
              {event.registration_deadline && (
                <p className="mt-1 text-sm text-slate-500">
                  Registration closes on {formatDateTime(event.registration_deadline)}.
                </p>
              )}
              <RsvpForm
                eventId={event.id}
                slug={event.slug}
                hasRsvp={!!myRsvp}
                spotsLeft={spotsLeft}
                isRegistrationClosed={isRegistrationClosed}
              />
            </div>
          )}

          {/* Visitors and unapproved accounts can RSVP without becoming members. */}
          {(!userId || !isApproved) && (
            <div>
              <h2 className="font-display text-xl font-semibold">RSVP for this event</h2>
              <p className="mt-1 text-sm text-slate-600">
                Fill in your details below. Existing members may sign in to attach the RSVP to their profile.
              </p>
              <GuestRsvpForm eventId={event.id} sourcePath={`/events/${event.slug}`} />
              {!userId && (
                <p className="mt-4 text-sm text-slate-500">
                  Already a member?{' '}
                  <Link className="font-medium text-[#0F2557] underline" href={`/login?redirect=/events/${event.slug}`}>
                    Sign in
                  </Link>
                </p>
              )}
            </div>
          )}

        </Card>
      )}

      {/* Share Section */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        <h3 className="font-display text-sm font-semibold text-slate-700 mb-3">Share Event with Alumni</h3>
        <ShareButtons eventTitle={event.title} eventUrl={eventUrl} />
      </div>
    </article>
  );
}
