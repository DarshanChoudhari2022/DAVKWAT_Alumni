import { NextResponse } from 'next/server';
import { differenceInCalendarDays, format } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { APP_URL, FROM_EMAIL, getResend } from '@/lib/resend/client';

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get('x-cron-secret');
  const urlSecret = new URL(request.url).searchParams.get('secret');
  return headerSecret === secret || urlSecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'Event reminders are ready, but RESEND_API_KEY is not configured yet.' },
      { status: 503 }
    );
  }

  try {
    const admin = createAdminClient();
    const now = new Date();
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [{ data: events }, { data: sentToday }] = await Promise.all([
      admin
        .from('events')
        .select('id, title, slug, starts_at, venue, online_link')
        .eq('is_published', true)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', sevenDaysAhead)
        .order('starts_at', { ascending: true }),
      admin
        .from('audit_log')
        .select('target_id, metadata')
        .eq('action', 'event_reminder_sent')
        .gte('created_at', startOfToday),
    ]);

    const sentKeys = new Set(
      (sentToday ?? [])
        .map((entry) => {
          const daysRemaining =
            entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
              ? entry.metadata.days_remaining
              : null;
          return daysRemaining != null && entry.target_id
            ? `${entry.target_id}:${daysRemaining}`
            : null;
        })
        .filter(Boolean) as string[]
    );

    const EventReminderEmail = (await import('@/emails/EventReminderEmail')).default;
    const resend = getResend();
    let sent = 0;

    for (const event of events ?? []) {
      const daysRemaining = differenceInCalendarDays(new Date(event.starts_at), now);
      if (![7, 1].includes(daysRemaining)) {
        continue;
      }

      const { data: rsvps } = await admin
        .from('event_rsvps')
        .select('id, profiles!inner(full_name, email)')
        .eq('event_id', event.id);

      for (const rsvp of rsvps ?? []) {
        const recipient =
          rsvp.profiles && !Array.isArray(rsvp.profiles) ? rsvp.profiles : null;

        if (!recipient?.email) {
          continue;
        }

        const deDupeKey = `${rsvp.id}:${daysRemaining}`;
        if (sentKeys.has(deDupeKey)) {
          continue;
        }

        await resend.emails.send({
          from: FROM_EMAIL,
          to: recipient.email,
          subject: `Reminder: ${event.title} is in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
          react: EventReminderEmail({
            fullName: recipient.full_name,
            eventTitle: event.title,
            eventDate: format(new Date(event.starts_at), 'dd MMM yyyy'),
            eventTime: format(new Date(event.starts_at), 'hh:mm a'),
            venue: event.venue ?? undefined,
            onlineLink: event.online_link ?? undefined,
            eventUrl: `${APP_URL}/events/${event.slug}`,
          }),
        });

        await writeAuditLog({
          actor_id: null,
          action: 'event_reminder_sent',
          target_type: 'event_rsvp',
          target_id: rsvp.id,
          metadata: {
            event_id: event.id,
            days_remaining: daysRemaining,
          },
        });

        sentKeys.add(deDupeKey);
        sent += 1;
      }
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error('[cron/event-reminders]', error);
    return NextResponse.json({ error: 'Failed to process event reminders.' }, { status: 500 });
  }
}
