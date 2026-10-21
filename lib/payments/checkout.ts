import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveAppUrl } from '@/lib/utils/app-url';
import { getEasebuzzConfig } from '@/lib/easebuzz/config';
import { initiatePayment } from '@/lib/easebuzz/initiate';
import { MEMBERSHIP_PRICES, type PaidMembershipType } from './plans';

export async function startMembershipCheckout(input: {
  userId: string; fullName: string; email: string; phone: string;
  membershipType: PaidMembershipType; source: 'registration' | 'membership';
}) {
  getEasebuzzConfig();
  const admin = createAdminClient();
  const amount = MEMBERSHIP_PRICES[input.membershipType];
  const { data: plan, error } = await admin.from('membership_plans')
    .select('id, amount, membership_type').eq('membership_type', input.membershipType)
    .eq('is_active', true).order('created_at').limit(1).maybeSingle();
  if (error || !plan || Number(plan.amount) !== amount) {
    throw new Error('The selected membership plan is unavailable. Please contact the Trust.');
  }
  const txnid = `DAV${randomUUID().replace(/-/g, '')}`;
  const callbackUrl = `${resolveAppUrl()}/api/payments/verify`;
  const params = {
    txnid, amount: amount.toFixed(2),
    productinfo: input.membershipType === 'annual' ? 'DAVKAWT Annual Membership' : 'DAVKAWT Lifetime Membership',
    firstname: input.fullName, email: input.email, phone: input.phone,
    surl: callbackUrl, furl: callbackUrl,
    udf1: input.userId, udf2: plan.id, udf3: input.membershipType,
    udf4: input.membershipType === 'annual' ? '12' : '', udf5: input.source,
  };
  // Persist the expected signed fields before checkout; callbacks must match these.
  const { error: insertError } = await admin.from('payments').insert({
    alumni_id: input.userId, plan_id: plan.id, txnid, amount, currency: 'INR',
    status: 'pending', payment_mode: 'easebuzz',
    gateway_response: { provider: 'easebuzz', environment: getEasebuzzConfig().environment, request: params },
  });
  if (insertError) throw new Error('Could not save the payment request. Please try again.');
  const result = await initiatePayment(params);
  if (!result.paymentUrl) {
    await admin.from('payments').update({ status: 'failed' }).eq('txnid', txnid).eq('status', 'pending');
    throw new Error(result.error ?? 'Could not start checkout.');
  }
  return { txnid, paymentUrl: result.paymentUrl };
}
