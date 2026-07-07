import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateAfterAction } from '@/lib/cache/invalidate';
import {
  getMembershipExpiryDate,
  markPaymentSuccessful,
  sendPaymentReceiptEmail,
} from '@/lib/payments/membership';
import { verifyPaymentHash } from '@/lib/easebuzz/verify';

function membershipRedirect(origin: string, path: string) {
  return new URL(path, origin);
}

/**
 * Easebuzz redirects here (surl / furl) after payment.
 * Receives form data with payment result.
 */
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = String(value);
    });

    const {
      txnid,
      status,
      hash,
      key,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      payment_source,
      PG_TYPE,
      bank_ref_num,
      easepayid,
    } = params;

    if (!txnid || !status || !hash) {
      return NextResponse.redirect(membershipRedirect(origin, '/membership?error=invalid_response'));
    }

    const isValid = verifyPaymentHash({
      key: key ?? '',
      txnid,
      amount: amount ?? '',
      productinfo: productinfo ?? '',
      firstname: firstname ?? '',
      email: email ?? '',
      status,
      hash,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
    });

    if (!isValid) {
      console.error('[payments/verify] hash verification failed for txnid:', txnid);
      return NextResponse.redirect(membershipRedirect(origin, '/membership?error=hash_mismatch'));
    }

    const admin = createAdminClient();

    if (status === 'success') {
      const { alreadyProcessed } = await markPaymentSuccessful({
        txnid,
        params,
        easepayid,
        paymentMode: PG_TYPE ?? payment_source ?? null,
        bankRefNum: bank_ref_num ?? null,
      });

      // Another handler (webhook or a duplicate redirect) already finalised this
      // transaction — skip the side effects so membership isn't double-granted
      // and the receipt email isn't sent twice.
      if (alreadyProcessed) {
        return NextResponse.redirect(membershipRedirect(origin, '/membership?status=success'));
      }

      const alumniId = udf1;
      const membershipType = udf3 as 'lifetime' | 'annual' | undefined;
      const durationMonths = udf4 ? parseInt(udf4, 10) : null;

      if (alumniId) {
        const expiresAt = getMembershipExpiryDate(membershipType, durationMonths);

        await admin
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
        actor_id: udf1 ?? null,
        action: 'payment_success',
        target_type: 'payment',
        metadata: { txnid, amount, plan_id: udf2 },
      });

      await sendPaymentReceiptEmail({
        txnid,
        alumniId,
        planId: udf2,
        amount,
        membershipType,
      });

      // Committed success: payment marked successful + manual membership granted.
      // Invalidate payments + dashboard stat caches (design Section 4).
      invalidateAfterAction('payment_status');

      return NextResponse.redirect(membershipRedirect(origin, '/membership?status=success'));
    }

    await admin
      .from('payments')
      .update({
        status: 'failed',
        gateway_response: params,
        updated_at: new Date().toISOString(),
      })
      .eq('txnid', txnid)
      .neq('status', 'success');

    // Committed failed-status mark also shifts the payments aggregates.
    invalidateAfterAction('payment_status');

    return NextResponse.redirect(membershipRedirect(origin, '/membership?status=failed'));
  } catch (err) {
    console.error('[payments/verify] unexpected error:', err);
    return NextResponse.redirect(membershipRedirect(origin, '/membership?error=server_error'));
  }
}
