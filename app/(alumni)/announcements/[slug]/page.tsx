/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Pin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils/format';
import { formatAnnouncementHtml, stripHtml } from '@/lib/utils/sanitize';
import { formatDateTime } from '@/lib/utils/format';
import { RsvpForm } from '../../events/[slug]/RsvpForm';
import { GuestRsvpForm } from '../../events/GuestRsvpForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('announcements')
    .select('title, content')
    .eq('slug', slug)
    .single();
  return {
    title: data?.title ?? 'Announcement',
    description: data?.content ? stripHtml(data.content).slice(0, 200) : undefined,
  };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: a } = await supabase
    .from('announcements')
    .select('id, title, content, is_pinned, published_at, cover_image_url, scheduled_for, rsvp_event_id')
    .eq('slug', slug)
    .eq('is_published', true)
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .single();

  if (!a) notFound();

  const [{ data: linkedEvent }, userResult] = await Promise.all([
    a.rsvp_event_id
      ? supabase
          .from('events')
          .select('id, title, slug, starts_at, registration_deadline, max_attendees')
          .eq('id', a.rsvp_event_id)
          .eq('is_published', true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ]);

  const userId = userResult.data.user?.id ?? null;
  const [profileResult, myRsvpResult, countResult] = linkedEvent
    ? await Promise.all([
        userId
          ? supabase.from('profiles').select('approval_status').eq('id', userId).maybeSingle()
          : Promise.resolve({ data: null }),
        userId
          ? supabase.from('event_rsvps').select('id').eq('event_id', linkedEvent.id).eq('alumni_id', userId).maybeSingle()
          : Promise.resolve({ data: null }),
        linkedEvent.max_attendees != null
          ? supabase.from('event_rsvps').select('id', { count: 'exact', head: true }).eq('event_id', linkedEvent.id)
          : Promise.resolve({ count: null }),
      ])
    : [{ data: null }, { data: null }, { count: null }];
  const isApproved = profileResult.data?.approval_status === 'approved';
  const spotsLeft = linkedEvent?.max_attendees != null && countResult.count != null
    ? Math.max(0, linkedEvent.max_attendees - countResult.count)
    : null;
  const isRegistrationClosed = linkedEvent
    ? new Date(linkedEvent.starts_at).getTime() <= Date.now()
      || (linkedEvent.registration_deadline != null && new Date(linkedEvent.registration_deadline).getTime() <= Date.now())
    : true;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/announcements" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0F2557]">
        <ArrowLeft aria-hidden className="h-4 w-4" /> Back to announcements
      </Link>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {a.is_pinned && (
            <Badge variant="warning" className="inline-flex items-center gap-1">
              <Pin aria-hidden className="h-3 w-3" /> Pinned
            </Badge>
          )}
          <span className="text-xs text-slate-500">
            {a.published_at ? formatDate(a.published_at) : 'Draft'}
          </span>
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{a.title}</h1>
      </header>

      <Card className="mt-6 p-6 sm:p-8">
        {a.cover_image_url && (
          <img
            src={a.cover_image_url}
            alt={a.title}
            className="mb-6 h-auto w-full rounded-2xl border border-slate-200 object-cover"
          />
        )}
        <div
          className="prose-davkawt max-w-none text-base"
          dangerouslySetInnerHTML={{ __html: formatAnnouncementHtml(a.content) }}
        />
      </Card>

      {linkedEvent && !isRegistrationClosed && (
        <Card className="mt-6 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <Calendar className="mt-1 h-5 w-5 shrink-0 text-[#0F2557]" />
            <div>
              <h2 className="font-display text-xl font-semibold">RSVP: {linkedEvent.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(linkedEvent.starts_at)}</p>
            </div>
          </div>
          {userId && isApproved ? (
            <RsvpForm
              eventId={linkedEvent.id}
              slug={linkedEvent.slug}
              hasRsvp={Boolean(myRsvpResult.data)}
              spotsLeft={spotsLeft}
              isRegistrationClosed={isRegistrationClosed}
            />
          ) : (
            <GuestRsvpForm eventId={linkedEvent.id} sourcePath={`/announcements/${slug}`} />
          )}
        </Card>
      )}
    </article>
  );
}
