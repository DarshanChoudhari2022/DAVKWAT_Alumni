import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { APP_URL } from '@/lib/resend/client';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const { planId } = (await req.json()) as { planId?: string };
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required.' }, { status: 400 });
    }

    const [{ data: profile }, { data: plan }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, approval_status, is_active')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('membership_plans')
        .select('id, name, amount, membership_type, duration_months')
        .eq('id', planId)
        .eq('is_active', true)
        .maybeSingle(),
    ]);

    if (!profile || profile.approval_status !== 'approved' || profile.is_active === false) {
      return NextResponse.json(
        { error: 'Only approved alumni can submit membership requests.' },
        { status: 403 }
      );
    }

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found or inactive.' }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: existingPending, error: pendingError } = await admin
      .from('payments')
      .select('id, txnid')
      .eq('alumni_id', user.id)
      .eq('plan_id', plan.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }

    if (existingPending) {
      return NextResponse.json({
        success: true,
        txnid: existingPending.txnid,
        message:
          'This membership request is already pending with the admin team. Payment instructions will be shared separately.',
      });
    }

    const txnid = `DAVKAWT-MANUAL-${Date.now()}-${nanoid(6).toUpperCase()}`;
    const gatewayConfigured = Boolean(process.env.EASEBUZZ_KEY && process.env.EASEBUZZ_SALT);
    const { error: insertError } = await admin.from('payments').insert({
      alumni_id: user.id,
      plan_id: plan.id,
      txnid,
      amount: plan.amount,
      status: 'pending',
      payment_mode: gatewayConfigured ? 'easebuzz' : 'manual_review',
      gateway_response: {
        mode: gatewayConfigured ? 'easebuzz' : 'manual_review',
        note: gatewayConfigured
          ? 'Gateway initiation prepared. Merchant credentials must be verified before live use.'
          : 'Gateway credentials are not configured yet, so the request is recorded for manual follow-up.',
        membership_type: plan.membership_type,
        duration_months: plan.duration_months,
      },
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await writeAuditLog({
      actor_id: user.id,
      action: 'membership_request_submitted',
      target_type: 'payment',
      metadata: {
        txnid,
        plan_id: plan.id,
        plan_name: plan.name,
        amount: plan.amount,
      },
    });

    if (gatewayConfigured) {
      const { initiatePayment } = await import('@/lib/easebuzz/initiate');
      const payment = await initiatePayment({
        txnid,
        amount: Number(plan.amount).toFixed(2),
        productinfo: plan.name,
        firstname: profile.full_name,
        email: user.email ?? '',
        surl: `${APP_URL}/api/payments/verify`,
        furl: `${APP_URL}/api/payments/verify`,
        udf1: user.id,
        udf2: plan.id,
        udf3: plan.membership_type,
        udf4: plan.duration_months ? String(plan.duration_months) : '',
      });

      if (payment.error || !payment.paymentUrl) {
        await admin
          .from('payments')
          .update({
            status: 'failed',
            gateway_response: {
              mode: 'easebuzz',
              error: payment.error ?? 'Payment initiation failed',
            },
            updated_at: new Date().toISOString(),
          })
          .eq('txnid', txnid);

        return NextResponse.json(
          { error: payment.error ?? 'Could not start the payment.' },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        txnid,
        redirectUrl: payment.paymentUrl,
        message: `Redirecting to Easebuzz for ${plan.name}.`,
      });
    }

    return NextResponse.json({
      success: true,
      txnid,
      message: `${plan.name} request recorded. Easebuzz credentials are not configured yet, so the admin team will follow up manually.`,
    });
  } catch (err) {
    console.error('[payments/initiate] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
