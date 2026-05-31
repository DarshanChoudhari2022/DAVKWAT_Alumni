import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { getResend, FROM_EMAIL, APP_URL } from '@/lib/resend/client';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { adminAccess, error: authError } = await requireAdminApiAccess();
    if (authError || !adminAccess) return authError;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Event reminders are ready, but RESEND_API_KEY is not configured yet.' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const supabase = adminAccess.database;

    const [{ data: event }, { data: rsvps }] = await Promise.all([
      supabase
        .from('events')
        .select('id, title, slug, starts_at, venue, online_link')
        .eq('id', id)
        .single(),
      supabase
        .from('event_rsvps')
        .select('profiles!inner(full_name, email)')
        .eq('event_id', id),
    ]);

    if (!event) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const recipients = (rsvps ?? [])
      .map((row) =>
        row.profiles && !Array.isArray(row.profiles)
          ? { full_name: row.profiles.full_name, email: row.profiles.email }
          : null
      )
      .filter((value): value is { full_name: string; email: string } => Boolean(value?.email));

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No RSVPs found for this event.' }, { status: 400 });
    }

    const EventReminderEmail = (await import('@/emails/EventReminderEmail')).default;
    const resend = getResend();

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        resend.emails.send({
          from: FROM_EMAIL,
          to: recipient.email,
          subject: `Reminder: ${event.title}`,
          react: EventReminderEmail({
            fullName: recipient.full_name,
            eventTitle: event.title,
            eventDate: format(new Date(event.starts_at), 'dd MMM yyyy'),
            eventTime: format(new Date(event.starts_at), 'hh:mm a'),
            venue: event.venue ?? undefined,
            onlineLink: event.online_link ?? undefined,
            eventUrl: `${APP_URL}/events/${event.slug}`,
          }),
        })
      )
    );

    const sentCount = results.filter((result) => result.status === 'fulfilled').length;

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: results.length - sentCount,
    });
  } catch (error) {
    console.error('[admin/events/reminders]', error);
    return NextResponse.json({ error: 'Could not send event reminders.' }, { status: 500 });
  }
}
