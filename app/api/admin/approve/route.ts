import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateAfterAction } from '@/lib/cache/invalidate';

export async function POST(req: Request) {
  try {
    const { adminAccess, error } = await requireAdminApiAccess();
    if (error || !adminAccess) return error;

    const { alumniId } = (await req.json()) as { alumniId?: string };
    if (!alumniId) {
      return NextResponse.json({ error: 'Alumni ID is required.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: pendingProfile, error: profileError } = await admin
      .from('profiles')
      .select('profile_type')
      .eq('id', alumniId)
      .eq('approval_status', 'pending')
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!pendingProfile) {
      return NextResponse.json(
        { error: 'Registration not found or already reviewed.' },
        { status: 409 }
      );
    }

    const isFaculty = pendingProfile.profile_type === 'faculty';
    const now = new Date().toISOString();

    const { data: approvedProfile, error: updateError } = await admin
      .from('profiles')
      .update({
        approval_status: 'approved',
        role: 'alumni',
        approved_at: now,
        approved_by: adminAccess.actorProfileId,
        rejection_reason: null,
        updated_at: now,
        is_paid_member: isFaculty ? true : undefined,
        membership_type: isFaculty ? 'lifetime' : undefined,
        membership_expires_at: isFaculty ? null : undefined,
      })
      .eq('id', alumniId)
      .eq('approval_status', 'pending')
      .select('id, email, full_name, profile_type')
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!approvedProfile) {
      return NextResponse.json(
        { error: 'Registration not found or already reviewed.' },
        { status: 409 }
      );
    }

    // Invalidate cached pending-approvals badge + dashboard stats after the
    // committed approve write (design Section 4 invalidation table; Req 4.4, 9.1, 9.6).
    invalidateAfterAction('approve_reject');

    after(async () => {
      await Promise.all([
        writeAuditLog({
          actor_id: adminAccess.actorProfileId,
          action: 'alumni_approved',
          target_type: 'profile',
          target_id: alumniId,
        }),
        sendApprovalEmail(approvedProfile.email, approvedProfile.full_name),
      ]);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[approve] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

async function sendApprovalEmail(email: string, fullName: string) {
  try {
    const { getResend, FROM_EMAIL, APP_URL } = await import('@/lib/resend/client');
    const ApprovalEmail = (await import('@/emails/ApprovalEmail')).default;
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your DAVKAWT registration has been approved',
      react: ApprovalEmail({ name: fullName, loginUrl: `${APP_URL}/login` }),
    });
  } catch (emailErr) {
    console.error('[approve] email send failed:', emailErr);
  }
}
