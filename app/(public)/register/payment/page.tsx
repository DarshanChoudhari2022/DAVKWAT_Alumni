import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PayButton } from '@/app/(alumni)/membership/PayButton';
import { MEMBERSHIP_PRICES } from '@/lib/payments/plans';
import { Card } from '@/components/ui/card';
import { PaymentVerification } from '@/components/shared/PaymentVerification';

export default async function RegistrationPaymentPage({ searchParams }: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = user ? createAdminClient() : null;
  const { data: profile } = admin && user ? await admin.from('profiles')
    .select('id, profile_type, is_paid_member, membership_type, approval_status, is_active')
    .eq('id', user.id).maybeSingle() : { data: null };
  const paid = profile?.is_paid_member;
  const canPay = profile && profile.profile_type !== 'faculty' && profile.is_active !== false
    && profile.approval_status !== 'rejected' && !paid;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold">Membership payment</h1>
      <Card className="space-y-3 p-6">
        {paid ? (
          <p role="status" className="text-emerald-700">Your membership payment is verified. Trust approval is handled separately.</p>
        ) : params.status === 'success' ? (
          <p role="status">Your payment response has been received. Sign in after verifying your email to check the confirmed membership status.</p>
        ) : params.status === 'failed' ? (
          <p role="status">This payment attempt needs a status check. If money was debited, check its verified status before paying again.</p>
        ) : params.error ? (
          <p role="status">Your payment could not be verified yet. This does not mean it failed. Sign in to check its status; if debited, do not pay again.</p>
        ) : (
          <p>Your registration is saved. Complete your membership payment securely with Easebuzz.</p>
        )}
        <p className="text-sm text-slate-600">If you received a verification email, confirm your email before signing in. You do not need to register again.</p>
        <div className="flex gap-4">
          <Link href="/login" className="underline">Sign in</Link>
          <Link href="/pending-approval" className="underline">Check registration status</Link>
        </div>
      </Card>
      {user && !paid && <PaymentVerification />}
      {canPay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="space-y-4 p-6"><h2>Yearly membership · ₹500</h2>
            <PayButton membershipType="annual" planName="Yearly membership" amount={MEMBERSHIP_PRICES.annual} />
          </Card>
          <Card className="space-y-4 p-6"><h2>Lifetime membership · ₹5,000</h2>
            <PayButton membershipType="lifetime" planName="Lifetime membership" amount={MEMBERSHIP_PRICES.lifetime} />
          </Card>
        </div>
      )}
    </div>
  );
}
