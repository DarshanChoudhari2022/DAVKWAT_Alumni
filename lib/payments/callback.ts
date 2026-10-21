import { createAdminClient } from '@/lib/supabase/admin';
import { verifyPaymentHash } from '@/lib/easebuzz/verify';
import { getEasebuzzConfig } from '@/lib/easebuzz/config';
import { invalidateAfterAction } from '@/lib/cache/invalidate';
import { sendPaymentReceiptEmail } from './membership';

export class PaymentCallbackError extends Error {
  constructor(message: string, public statusCode: number) { super(message); }
}

export async function processEasebuzzCallback(params: Record<string, string>) {
  if (!params.txnid || !params.status || !verifyPaymentHash(params)) {
    throw new PaymentCallbackError('Invalid payment signature.', 403);
  }
  const admin = createAdminClient();
  const { data: payment, error } = await admin.from('payments')
    .select('id, alumni_id, plan_id, amount, currency, gateway_response').eq('txnid', params.txnid).maybeSingle();
  if (error) throw new Error('Could not read the payment.');
  if (!payment) throw new PaymentCallbackError('Unknown payment.', 404);
  const metadata = payment.gateway_response;
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object' || metadata.provider !== 'easebuzz'
    || metadata.environment !== getEasebuzzConfig().environment) {
    throw new PaymentCallbackError('Payment provider does not match.', 400);
  }
  const expected = metadata.request;
  if (!expected || Array.isArray(expected) || typeof expected !== 'object') {
    throw new PaymentCallbackError('Payment request is missing.', 400);
  }
  const matches = ['txnid', 'productinfo', 'firstname', 'email', 'udf1', 'udf2', 'udf3', 'udf4', 'udf5']
    .every((field) => (params[field] ?? '') === expected[field]);
  if (!matches || !/^\d+(\.\d{1,2})?$/.test(params.amount ?? '') || Number(params.amount) !== Number(payment.amount)
    || payment.currency !== 'INR' || params.udf1 !== payment.alumni_id || params.udf2 !== payment.plan_id) {
    throw new PaymentCallbackError('Payment details do not match.', 400);
  }
  const status = params.status === 'success' ? 'success'
    : ['failure', 'failed', 'userCancelled', 'cancelled', 'dropped', 'bounced'].includes(params.status) ? 'failed' : 'pending';
  const { data: result, error: finalizeError } = await admin.rpc('finalize_easebuzz_payment', {
    p_txnid: params.txnid, p_status: status, p_response: params,
  });
  if (finalizeError || !result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Could not finalize the payment. Check the Easebuzz database migration.');
  }
  invalidateAfterAction('payment_status');
  if (result.status === 'success' && !result.duplicate) {
    await sendPaymentReceiptEmail({
      txnid: params.txnid, alumniId: payment.alumni_id, planId: payment.plan_id,
      amount: payment.amount, membershipType: params.udf3 === 'lifetime' ? 'lifetime' : 'annual',
    });
  }
  return {
    status: result.status === 'success' ? 'success' : result.status === 'failed' ? 'failed' : 'pending',
    duplicate: result.duplicate === true,
    source: expected.udf5 === 'registration' ? 'registration' : 'membership',
  };
}
