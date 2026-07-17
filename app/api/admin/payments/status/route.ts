import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { invalidateAfterAction } from '@/lib/cache/invalidate';
import { getMembershipExpiryDate } from '@/lib/payments/membership';
import { manualPaymentStatusSchema } from '@/lib/validations/admin';

export async function POST(req: NextRequest) {
  const { adminAccess, error: authError } = await requireAdminApiAccess();
  if (authError || !adminAccess) return authError;

  const body = await req.json().catch(() => ({}));
  const parsed = manualPaymentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid payment status update.' },
      { status: 400 }
    );
  }

  const supabase = adminAccess.database;
  const now = new Date().toISOString();

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('id, alumni_id, amount, plan_id')
    .eq('id', parsed.data.paymentId)
    .maybeSingle();

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  if (!payment) {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: parsed.data.status,
      updated_at: now,
      gateway_response: {
        reviewed_by: adminAccess.actorProfileId,
        reviewed_at: now,
        review_source: 'admin_manual_review',
      },
    })
    .eq('id', payment.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (parsed.data.status === 'success') {
    let membershipType: 'annual' | 'lifetime' = Number(payment.amount) >= 5000 ? 'lifetime' : 'annual';
    let durationMonths: number | null = membershipType === 'annual' ? 12 : null;

    if (payment.plan_id) {
      const { data: plan } = await supabase
        .from('membership_plans')
        .select('membership_type, duration_months')
        .eq('id', payment.plan_id)
        .maybeSingle();

      if (plan?.membership_type === 'lifetime' || plan?.membership_type === 'annual') {
        membershipType = plan.membership_type;
        durationMonths = plan.duration_months;
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_paid_member: true,
        membership_type: membershipType,
        membership_expires_at: getMembershipExpiryDate(membershipType, durationMonths),
        updated_at: now,
      })
      .eq('id', payment.alumni_id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
  }

  await writeAuditLog({
    actor_id: adminAccess.actorProfileId,
    action: 'manual_payment_status_update',
    target_type: 'payment',
    target_id: payment.id,
    metadata: { status: parsed.data.status, alumni_id: payment.alumni_id },
  });

  invalidateAfterAction('payment_status');

  return NextResponse.json({ success: true });
}
