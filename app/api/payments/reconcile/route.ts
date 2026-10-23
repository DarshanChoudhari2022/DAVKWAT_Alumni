import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEasebuzzConfig } from '@/lib/easebuzz/config';
import { reconcilePayment } from '@/lib/payments/reconcile';
import { isMembershipActive } from '@/lib/payments/membership';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to check your payment.' }, { status: 401 });
  try {
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin.from('profiles')
      .select('is_paid_member, membership_type, membership_expires_at').eq('id', user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile && isMembershipActive(profile.is_paid_member, profile.membership_type, profile.membership_expires_at)) {
      return NextResponse.json({ status: 'success', hasPayments: true, verificationPending: false });
    }
    const { data, error } = await admin.from('payments').select('txnid')
      .eq('alumni_id', user.id).in('status', ['pending', 'failed'])
      .eq('gateway_response->>provider', 'easebuzz')
      .eq('gateway_response->>environment', getEasebuzzConfig().environment)
      .order('created_at', { ascending: false }).limit(3);
    if (error) throw error;
    const results = await Promise.all((data ?? []).map((payment) => reconcilePayment(payment.txnid, 'member', user.id)));
    return NextResponse.json({ status: results.some((r) => r.status === 'success') ? 'success'
      : results.length && results.every((r) => r.status === 'failed' && !('verificationPending' in r && r.verificationPending)) ? 'failed' : 'pending',
      verificationPending: results.some((r) => 'verificationPending' in r && r.verificationPending),
      hasPayments: results.length > 0 });
  } catch {
    return NextResponse.json({ error: 'Confirmation is temporarily unavailable. If debited, do not pay again.' }, { status: 503 });
  }
}
