import { createAdminClient } from '@/lib/supabase/admin';

export type VerificationSource = 'webhook' | 'return' | 'member' | 'admin' | 'cron';

export async function recordVerification(txnid: string, source: VerificationSource, result: {
  status?: string; error?: string; failureReason?: string;
}) {
  try {
    const admin = createAdminClient();
    let { data, error } = await admin.from('payments').update({
      verification_checked_at: new Date().toISOString(),
      verification_error: result.error ?? null,
      ...(result.status ? { gateway_status: result.status } : {}),
      ...(result.failureReason !== undefined ? { failure_reason: result.failureReason } : {}),
    }).eq('txnid', txnid).select('id').maybeSingle();
    if (error) {
      // Keep an audit history even during the additive migration rollout.
      const lookup = await admin.from('payments').select('id').eq('txnid', txnid).maybeSingle();
      data = lookup.data;
      error = lookup.error;
      console.error('[payments/verification-log]', { txnid, source, code: 'diagnostic_columns_unavailable' });
    }
    if (error || !data) throw new Error('Verification record unavailable');
    const { error: auditError } = await admin.from('audit_log').insert({
      action: 'easebuzz_verification', target_type: 'payment', target_id: data.id,
      metadata: { source, status: result.status ?? null, error: result.error ?? null, failure_reason: result.failureReason ?? null },
    });
    if (auditError) throw new Error('Verification audit unavailable');
  } catch {
    // Payment finalization must survive a diagnostic write failing. Platform logs
    // retain the failure without exposing signatures, keys or customer details.
    console.error('[payments/verification-log]', { txnid, source, code: 'diagnostic_write_failed' });
  }
}
