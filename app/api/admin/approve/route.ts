import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
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

    const { alumniId } = (await req.json()) as { alumniId: string };
    if (!alumniId) return NextResponse.json({ error: 'Alumni ID is required.' }, { status: 400 });

    // Update profile via Prisma
    const result = await prisma.profiles.updateMany({
      where: {
        id: alumniId,
        approval_status: 'pending',
      },
      data: {
        approval_status: 'approved',
        role: 'alumni',
        approved_at: new Date(),
        approved_by: user.id,
        rejection_reason: null,
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
        action: 'alumni_approved',
        target_type: 'profile',
        target_id: alumniId,
      },
    });

    // Send approval email (non-blocking)
    try {
      const approvedProfile = await prisma.profiles.findUnique({
        where: { id: alumniId },
        select: { email: true, full_name: true },
      });

      if (approvedProfile) {
        const { getResend, FROM_EMAIL } = await import('@/lib/resend/client');
        const { APP_URL } = await import('@/lib/resend/client');
        const ApprovalEmail = (await import('@/emails/ApprovalEmail')).default;

        const resend = getResend();
        await resend.emails.send({
          from: FROM_EMAIL,
          to: approvedProfile.email,
          subject: 'Your DAVKAWT registration has been approved',
          react: ApprovalEmail({
            name: approvedProfile.full_name,
            loginUrl: `${APP_URL}/login`,
          }),
        });
      }
    } catch (emailErr) {
      console.error('[approve] email send failed:', emailErr);
      // Approval still succeeded — email is non-critical
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Approve error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
