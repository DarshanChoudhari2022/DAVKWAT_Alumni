import { createAdminClient } from '@/lib/supabase/admin';
import { getEasebuzzConfig } from '@/lib/easebuzz/config';
import { retrievePayment } from '@/lib/easebuzz/retrieve';
import { processEasebuzzCallback } from './callback';
import { recordVerification, type VerificationSource } from './verification-log';

export class ReconciliationError extends Error {
  constructor(message: string, public statusCode: number) { super(message); }
}

export async function reconcilePayment(txnid: string, source: VerificationSource, ownerId?: string) {
  const admin = createAdminClient();
  // '*' permits immediate recovery even while the additive diagnostics migration
  // is being applied; missing diagnostic columns must not block a real payment.
  let query = admin.from('payments').select('*').eq('txnid', txnid);
  if (ownerId) query = query.eq('alumni_id', ownerId);
  const { data: payment, error } = await query.maybeSingle();
  if (error) throw new ReconciliationError('Could not load payment verification. Apply migration 0024.', 503);
  if (!payment) throw new ReconciliationError('Payment not found.', 404);
  const metadata = payment.gateway_response;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)
    || metadata.provider !== 'easebuzz' || metadata.environment !== getEasebuzzConfig().environment) {
    throw new ReconciliationError('Payment gateway environment does not match.', 409);
  }
  if (['success', 'refunded'].includes(payment.status)) return { status: payment.status, checked: false };
  if (payment.verification_checked_at && Date.now() - Date.parse(payment.verification_checked_at) < 20_000) {
    return { status: payment.status, checked: false, verificationPending: true };
  }
  const { data: claimed, error: claimError } = await admin.rpc('claim_easebuzz_verification', {
    p_txnid: txnid, p_member_id: ownerId ?? null,
  });
  // During rollout the old finalizer can still recover a paid transaction, but
  // once migration 0024 exists every check has a database-enforced cooldown.
  if (claimError && !['PGRST202', '42883'].includes(claimError.code)) {
    throw new ReconciliationError('Could not reserve a verification attempt.', 503);
  }
  if (!claimError && !claimed) return { status: payment.status, checked: false, verificationPending: true };
  let params: Record<string, string>;
  try {
    params = await retrievePayment(txnid);
  } catch {
    await recordVerification(txnid, source, { error: 'gateway_lookup_unavailable' });
    return { status: payment.status, checked: false, verificationPending: true };
  }
  // Same signature, identity, amount and atomic membership checks as a webhook.
  const result = await processEasebuzzCallback(params, source);
  return { status: result.status, checked: true };
}
