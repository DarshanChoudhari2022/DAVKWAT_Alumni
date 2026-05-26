import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';
import { initiatePayment } from '@/lib/easebuzz/initiate';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const body = await req.json();
    const { planId } = body as { planId: string };

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required.' }, { status: 400 });
    }

    // Fetch plan
    const { data: plan } = await supabase
      .from('membership_plans')
      .select('id, name, amount, membership_type, duration_months')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found or inactive.' }, { status: 404 });
    }

    // Fetch alumni profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    const txnid = `DAVKAWT-${Date.now()}-${nanoid(6)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // Insert pending payment record
    const { error: insertError } = await supabase.from('payments').insert({
      alumni_id: user.id,
      plan_id: plan.id,
      txnid,
      amount: plan.amount,
      status: 'pending',
    });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create payment record.' }, { status: 500 });
    }

    // Initiate Easebuzz payment
    const result = await initiatePayment({
      txnid,
      amount: String(plan.amount),
      productinfo: `DAVKAWT ${plan.name} Membership`,
      firstname: profile.full_name.split(' ')[0] ?? profile.full_name,
      email: profile.email,
      phone: profile.phone ?? '',
      surl: `${appUrl}/api/payments/verify`,
      furl: `${appUrl}/api/payments/verify`,
      udf1: user.id,
      udf2: plan.id,
      udf3: plan.membership_type,
      udf4: String(plan.duration_months ?? ''),
    });

    if (result.error) {
      // Mark payment as failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('txnid', txnid);
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({
      accessKey: result.accessKey,
      paymentUrl: result.paymentUrl,
      txnid,
    });
  } catch (err) {
    console.error('Payment initiation error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
