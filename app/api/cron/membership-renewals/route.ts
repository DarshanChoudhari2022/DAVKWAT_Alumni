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
      { error: 'Membership renewal reminders are ready, but RESEND_API_KEY is not configured yet.' },
      { status: 503 }
    );
  }

  try {
    const admin = createAdminClient();
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const thirtyDaysIso = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [{ data: profiles }, { data: alreadySent }] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, email, membership_type, membership_expires_at')
        .eq('approval_status', 'approved')
        .eq('is_paid_member', true)
        .not('membership_expires_at', 'is', null)
        .gte('membership_expires_at', todayIso)
        .lte('membership_expires_at', thirtyDaysIso),
      admin
        .from('audit_log')
        .select('target_id')
        .eq('action', 'membership_renewal_reminder')
        .gte('created_at', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()),
    ]);

    const sentToday = new Set((alreadySent ?? []).map((entry) => entry.target_id).filter(Boolean));
    const MembershipRenewalEmail = (await import('@/emails/MembershipRenewalEmail')).default;
    const resend = getResend();

    let sent = 0;

    for (const profile of profiles ?? []) {
      if (!profile.membership_expires_at || sentToday.has(profile.id)) {
        continue;
      }

      const daysRemaining = differenceInCalendarDays(
        new Date(profile.membership_expires_at),
        now
      );

      if (![30, 14, 7, 1].includes(daysRemaining)) {
        continue;
      }

      await resend.emails.send({
        from: FROM_EMAIL,
        to: profile.email,
        subject: `Membership renewal reminder: ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`,
        react: MembershipRenewalEmail({
          fullName: profile.full_name,
          expiryDate: format(new Date(profile.membership_expires_at), 'dd MMM yyyy'),
          daysRemaining,
          planName: profile.membership_type === 'lifetime' ? 'Lifetime Membership' : 'Annual Membership',
          renewalUrl: `${APP_URL}/membership`,
          portalUrl: APP_URL,
        }),
      });

      await writeAuditLog({
        actor_id: null,
        action: 'membership_renewal_reminder',
        target_type: 'profile',
        target_id: profile.id,
        metadata: { days_remaining: daysRemaining },
      });

      sent += 1;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    console.error('[cron/membership-renewals]', error);
    return NextResponse.json({ error: 'Failed to process membership renewal reminders.' }, { status: 500 });
  }
}
