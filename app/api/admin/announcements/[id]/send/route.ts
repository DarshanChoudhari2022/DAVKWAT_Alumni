import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { APP_URL, FROM_EMAIL, getResend } from '@/lib/resend/client';

type DeliverySegment =
  | 'all'
  | 'paid_members'
  | 'free_members'
  | 'batch_year'
  | 'course'
  | 'city';

function buildExcerpt(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { adminAccess, error } = await requireAdminApiAccess();
    if (error || !adminAccess) return error;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Announcement emails are ready, but RESEND_API_KEY is not configured yet.' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as {
      segment?: DeliverySegment;
      segmentValue?: string;
    };

    const segment = body.segment ?? 'all';
    const segmentValue = body.segmentValue?.trim() ?? '';
    const supabase = adminAccess.database;

    const { data: announcement } = await supabase
      .from('announcements')
      .select('id, title, slug, content, is_published, scheduled_for')
      .eq('id', id)
      .maybeSingle();

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found.' }, { status: 404 });
    }

    if (!announcement.is_published) {
      return NextResponse.json(
        { error: 'Publish the announcement before sending it by email.' },
        { status: 400 }
      );
    }

    if (
      announcement.scheduled_for &&
      new Date(announcement.scheduled_for).getTime() > Date.now()
    ) {
      return NextResponse.json(
        { error: 'This announcement is scheduled for the future and cannot be sent yet.' },
        { status: 400 }
      );
    }

    let recipientsQuery = supabase
      .from('profiles')
      .select('id, full_name, email, batch_year, course, current_city')
      .eq('approval_status', 'approved')
      .eq('is_active', true);

    if (segment === 'paid_members') recipientsQuery = recipientsQuery.eq('is_paid_member', true);
    if (segment === 'free_members') recipientsQuery = recipientsQuery.eq('is_paid_member', false);
    if (segment === 'batch_year') {
      const parsedYear = Number.parseInt(segmentValue, 10);
      if (!Number.isFinite(parsedYear)) {
        return NextResponse.json({ error: 'Enter a valid batch year.' }, { status: 400 });
      }
      recipientsQuery = recipientsQuery.eq('batch_year', parsedYear);
    }
    if (segment === 'course') {
      if (!segmentValue) {
        return NextResponse.json({ error: 'Enter a course value.' }, { status: 400 });
      }
      recipientsQuery = recipientsQuery.ilike('course', `%${segmentValue}%`);
    }
    if (segment === 'city') {
      if (!segmentValue) {
        return NextResponse.json({ error: 'Enter a city value.' }, { status: 400 });
      }
      recipientsQuery = recipientsQuery.ilike('current_city', `%${segmentValue}%`);
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery.order('full_name');

    if (recipientsError) {
      return NextResponse.json({ error: recipientsError.message }, { status: 500 });
    }

    const validRecipients = (recipients ?? []).filter((recipient) => recipient.email);
    if (validRecipients.length === 0) {
      return NextResponse.json({ error: 'No recipients matched this segment.' }, { status: 400 });
    }

    const AnnouncementEmail = (await import('@/emails/AnnouncementEmail')).default;
    const resend = getResend();
    const excerpt = buildExcerpt(announcement.content);
    const announcementUrl = `${APP_URL}/announcements/${announcement.slug}`;

    const results = await Promise.allSettled(
      validRecipients.map((recipient) =>
        resend.emails.send({
          from: FROM_EMAIL,
          to: recipient.email,
          subject: `DAVKAWT Announcement: ${announcement.title}`,
          react: AnnouncementEmail({
            recipientName: recipient.full_name,
            title: announcement.title,
            excerpt,
            announcementUrl,
          }),
        })
      )
    );

    const sent = results.filter((result) => result.status === 'fulfilled').length;

    await writeAuditLog({
      actor_id: adminAccess.actorProfileId,
      action: 'announcement_bulk_email',
      target_type: 'announcement',
      target_id: announcement.id,
      metadata: {
        segment,
        segment_value: segmentValue || null,
        recipients: validRecipients.length,
        sent,
      },
    });

    return NextResponse.json({
      success: true,
      sent,
      failed: validRecipients.length - sent,
      segment,
      recipients: validRecipients.length,
    });
  } catch (error) {
    console.error('[admin/announcements/send]', error);
    return NextResponse.json({ error: 'Could not send announcement emails.' }, { status: 500 });
  }
}
