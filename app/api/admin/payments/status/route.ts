import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { requireAdminApiAccess } from '@/lib/auth/admin-api';
import { writeAuditLog } from '@/lib/audit';
import { invalidateAfterAction } from '@/lib/cache/invalidate';
import { manualPaymentStatusSchema } from '@/lib/validations/admin';
import { isEasebuzzPayment } from '@/lib/payments/provider';

interface PaymentReviewResult {
  payment_id: string;
  alumni_id: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  membership_type: 'annual' | 'lifetime' | null;
  membership_expires_at: string | null;
}

function isPaymentReviewResult(value: unknown): value is PaymentReviewResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return typeof result.payment_id === 'string' && typeof result.alumni_id === 'string';
}

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
  const { data: payment, error: paymentError } = await supabase.from('payments')
    .select('gateway_response, easebuzz_payment_id, payment_mode')
    .eq('id', parsed.data.paymentId).maybeSingle();
  if (paymentError) {
    return NextResponse.json({ error: 'Could not read payment.' }, { status: 500 });
  }
  if (!payment) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  if (isEasebuzzPayment(payment)) {
    return NextResponse.json(
      { error: 'Easebuzz payments are confirmed automatically by the gateway and cannot be manually changed.' },
      { status: 409 }
    );
  }
  // The database function locks and updates both records in one transaction.
  // A successful payment can no longer be committed without its membership.
  const { data: reviewData, error: reviewError } = await supabase.rpc(
    'review_manual_payment',
    {
      p_payment_id: parsed.data.paymentId,
      p_status: parsed.data.status,
      p_reviewed_by: adminAccess.actorProfileId,
    }
  );

  if (reviewError) {
    const status = reviewError.code === 'P0002' ? 404 : reviewError.code === '42501' ? 403 : 500;
    const message = status === 404 ? 'Payment not found.' : status === 403 ? 'Forbidden' : reviewError.message;
    return NextResponse.json({ error: message }, { status });
  }

  if (!isPaymentReviewResult(reviewData)) {
    return NextResponse.json({ error: 'Payment review returned an invalid result.' }, { status: 500 });
  }

  after(async () => {
    await writeAuditLog({
      actor_id: adminAccess.actorProfileId,
      action: 'manual_payment_status_update',
      target_type: 'payment',
      target_id: reviewData.payment_id,
      metadata: {
        status: parsed.data.status,
        alumni_id: reviewData.alumni_id,
        membership_type: reviewData.membership_type,
        membership_expires_at: reviewData.membership_expires_at,
      },
    });
  });

  invalidateAfterAction('payment_status');

  return NextResponse.json({ success: true });
}
