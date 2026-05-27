import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPaymentHash } from '@/lib/easebuzz/verify';

/**
 * Easebuzz redirects here (surl / furl) after payment.
 * Receives form data with payment result.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    const { txnid, status, hash, key, amount, productinfo, firstname, email,
      udf1, udf2, udf3, udf4, udf5, payment_source, PG_TYPE, bank_ref_num, easepayid } = params;

    if (!txnid || !status || !hash) {
      return NextResponse.redirect(new URL('/membership?error=invalid_response', process.env.NEXT_PUBLIC_APP_URL!));
    }

    // Verify hash
    const isValid = verifyPaymentHash({
      key: key ?? '',
      txnid,
      amount: amount ?? '',
      productinfo: productinfo ?? '',
      firstname: firstname ?? '',
      email: email ?? '',
      status,
      hash,
      udf1, udf2, udf3, udf4, udf5,
    });

    if (!isValid) {
      console.error('Payment hash verification failed for txnid:', txnid);
      return NextResponse.redirect(new URL('/membership?error=hash_mismatch', process.env.NEXT_PUBLIC_APP_URL!));
    }

    const supabase = await createClient();

    if (status === 'success') {
      // Update payment record
      await supabase
        .from('payments')
        .update({
          status: 'success',
          easebuzz_payment_id: easepayid ?? null,
          payment_mode: PG_TYPE ?? payment_source ?? null,
          bank_ref_num: bank_ref_num ?? null,
          gateway_response: params,
          updated_at: new Date().toISOString(),
        })
        .eq('txnid', txnid);

      // Update profile membership
      const alumniId = udf1;
      const membershipType = udf3 as 'lifetime' | 'annual' | undefined;
      const durationMonths = udf4 ? parseInt(udf4, 10) : null;

      if (alumniId) {
        const expiresAt =
          membershipType === 'lifetime'
            ? null
            : durationMonths
              ? new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('profiles')
          .update({
            is_paid_member: true,
            membership_type: membershipType ?? 'annual',
            membership_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', alumniId);
      }

      // Audit log
      await supabase.from('audit_log').insert({
        actor_id: alumniId ?? null,
        action: 'payment_success',
        target_type: 'payment',
        metadata: { txnid, amount, plan_id: udf2 },
      });

      return NextResponse.redirect(new URL('/membership?status=success', process.env.NEXT_PUBLIC_APP_URL!));
    } else {
      // Payment failed or cancelled
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          gateway_response: params,
          updated_at: new Date().toISOString(),
        })
        .eq('txnid', txnid);

      return NextResponse.redirect(new URL('/membership?status=failed', process.env.NEXT_PUBLIC_APP_URL!));
    }
  } catch (err) {
    console.error('Payment verification error:', err);
    return NextResponse.redirect(new URL('/membership?error=server_error', process.env.NEXT_PUBLIC_APP_URL!));
  }
}
