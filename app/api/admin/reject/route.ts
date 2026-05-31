import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPrisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const prisma = getPrisma();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

    // Verify admin role via Prisma
    const adminProfile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { alumniId, reason } = (await req.json()) as { alumniId: string; reason: string };
    if (!alumniId) return NextResponse.json({ error: 'Alumni ID is required.' }, { status: 400 });
    if (!reason?.trim()) return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });

    // Update profile via Prisma
    const result = await prisma.profiles.updateMany({
      where: {
        id: alumniId,
        approval_status: 'pending',
      },
      data: {
        approval_status: 'rejected',
        role: 'pending',
        approved_at: null,
        approved_by: null,
        rejection_reason: reason.trim(),
        updated_at: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Registration not found or already reviewed.' },
        { status: 409 }
      );
    }

    // Audit log via Prisma
    await prisma.audit_log.create({
      data: {
        actor_id: user.id,
        action: 'alumni_rejected',
        target_type: 'profile',
        target_id: alumniId,
        metadata: { reason: reason.trim() },
      },
    });

    // Send rejection email (non-blocking)
    try {
      const rejectedProfile = await prisma.profiles.findUnique({
        where: { id: alumniId },
        select: { email: true, full_name: true },
      });

      if (rejectedProfile) {
        const { getResend, FROM_EMAIL, ADMIN_EMAIL } = await import('@/lib/resend/client');
        const RejectionEmail = (await import('@/emails/RejectionEmail')).default;

        const resend = getResend();
        await resend.emails.send({
          from: FROM_EMAIL,
          to: rejectedProfile.email,
          subject: 'DAVKAWT Registration Update',
          react: RejectionEmail({
            name: rejectedProfile.full_name,
            reason: reason.trim(),
            contactEmail: ADMIN_EMAIL,
          }),
        });
      }
    } catch (emailErr) {
      console.error('[reject] email send failed:', emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reject error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
