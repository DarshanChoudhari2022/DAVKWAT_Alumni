import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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
    const { error: insertError } = await admin.from('payments').insert({
      alumni_id: user.id,
      plan_id: plan.id,
      txnid,
      amount: plan.amount,
      status: 'pending',
      payment_mode: 'manual_review',
      gateway_response: {
        mode: 'manual_review',
        note: 'Gateway integration intentionally skipped until production payment credentials are added.',
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

    return NextResponse.json({
      success: true,
      txnid,
      message: `${plan.name} request submitted. The DAVKAWT admin team will contact you with payment instructions.`,
    });
  } catch (err) {
    console.error('[payments/initiate] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
