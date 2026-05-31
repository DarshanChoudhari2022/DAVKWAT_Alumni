import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPaymentHash } from '@/lib/easebuzz/verify';

/**
 * Easebuzz server-to-server webhook.
 * Uses the admin (service role) client — no user session available.
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
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
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
      console.error('Webhook hash verification failed for txnid:', txnid);
      return NextResponse.json({ error: 'Hash mismatch.' }, { status: 403 });
    }

    const supabase = createAdminClient();

    if (status === 'success') {
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

      await writeAuditLog({
        actor_id: alumniId ?? null,
        action: 'payment_webhook_success',
        target_type: 'payment',
        metadata: { txnid, amount, plan_id: udf2 },
      });
    } else {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          gateway_response: params,
          updated_at: new Date().toISOString(),
        })
        .eq('txnid', txnid);
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
