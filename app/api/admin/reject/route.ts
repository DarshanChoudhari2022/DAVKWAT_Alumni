import { NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const { adminAccess, error } = await requireAdminApiAccess();
    if (error || !adminAccess) return error;

    const { alumniId, reason } = (await req.json()) as { alumniId?: string; reason?: string };
    if (!alumniId) {
      return NextResponse.json({ error: 'Alumni ID is required.' }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });
    }

    const trimmedReason = reason.trim();
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { data: rejectedProfile, error: updateError } = await admin
      .from('profiles')
      .update({
        approval_status: 'rejected',
        role: 'pending',
        approved_at: null,
        approved_by: null,
        rejection_reason: trimmedReason,
        updated_at: now,
      })
      .eq('id', alumniId)
      .eq('approval_status', 'pending')
      .select('id, email, full_name')
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!rejectedProfile) {
      return NextResponse.json(
        { error: 'Registration not found or already reviewed.' },
        { status: 409 }
      );
    }

    await writeAuditLog({
      actor_id: adminAccess.actorProfileId,
      action: 'alumni_rejected',
      target_type: 'profile',
      target_id: alumniId,
      metadata: { reason: trimmedReason },
    });

    try {
      const { getResend, FROM_EMAIL, ADMIN_EMAIL } = await import('@/lib/resend/client');
      const RejectionEmail = (await import('@/emails/RejectionEmail')).default;

      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: rejectedProfile.email,
        subject: 'DAVKAWT Registration Update',
        react: RejectionEmail({
          name: rejectedProfile.full_name,
          reason: trimmedReason,
          contactEmail: ADMIN_EMAIL,
        }),
      });
    } catch (emailErr) {
      console.error('[reject] email send failed:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[reject] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
