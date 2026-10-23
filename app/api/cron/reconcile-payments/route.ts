import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEasebuzzConfig } from '@/lib/easebuzz/config';
import { reconcilePayment } from '@/lib/payments/reconcile';

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(expected)
    || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    // Oldest/unverified records first, so a persistent pending transaction cannot
    // starve newer payments. Bounded batch/concurrency fits Hobby function limits.
    const { data, error } = await admin.from('payments').select('txnid')
      .in('status', ['pending', 'failed']).eq('gateway_response->>provider', 'easebuzz')
      .eq('gateway_response->>environment', getEasebuzzConfig().environment)
      .order('verification_checked_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true }).limit(20);
    if (error) throw error;
    let confirmed = 0, errors = 0;
    for (let offset = 0; offset < (data?.length ?? 0); offset += 5) {
      const batch = await Promise.allSettled(data!.slice(offset, offset + 5).map((payment) => reconcilePayment(payment.txnid, 'cron')));
      for (const item of batch) {
        if (item.status === 'rejected' || ('verificationPending' in item.value && item.value.verificationPending)) errors++;
        else if (item.value.status === 'success') confirmed++;
      }
    }
    return NextResponse.json({ checked: data?.length ?? 0, confirmed, errors });
  } catch {
    console.error('[payments/reconciliation]', { code: 'batch_unavailable' });
    return NextResponse.json({ error: 'Payment reconciliation unavailable. Check migration 0024 and gateway configuration.' }, { status: 503 });
  }
}
