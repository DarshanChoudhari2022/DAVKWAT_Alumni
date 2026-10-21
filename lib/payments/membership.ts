import { createAdminClient } from '@/lib/supabase/admin';
import { APP_URL, FROM_EMAIL, getResend } from '@/lib/resend/client';

export function getMembershipExpiryDate(
  membershipType: 'lifetime' | 'annual' | undefined,
  durationMonths: number | null,
  startsAt: string | Date = new Date()
) {
  if (membershipType === 'lifetime') {
    return null;
  }

  const start = new Date(startsAt);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const months = durationMonths && Number.isFinite(durationMonths) ? durationMonths : 12;
  const originalDay = safeStart.getUTCDate();
  const expiresAt = new Date(safeStart);

  // Calendar-month arithmetic preserves the payment day and correctly handles
  // leap years/month ends (for example, 29 Feb -> 28 Feb the following year).
  expiresAt.setUTCDate(1);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(expiresAt.getUTCFullYear(), expiresAt.getUTCMonth() + 1, 0)
  ).getUTCDate();
  expiresAt.setUTCDate(Math.min(originalDay, lastDay));

  return expiresAt.toISOString();
}

export function isMembershipActive(
  isPaidMember: boolean,
  membershipType: 'lifetime' | 'annual' | null | undefined,
  expiresAt: string | null | undefined,
  now: Date = new Date()
) {
  if (!isPaidMember) return false;
  if (membershipType === 'lifetime') return true;
  if (membershipType !== 'annual' || !expiresAt) return false;

  const expiryDay = expiresAt.slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  return expiryDay >= today;
}

export async function sendPaymentReceiptEmail(params: {
  txnid: string;
  alumniId: string | null | undefined;
  planId: string | null | undefined;
  amount: string | number | null | undefined;
  membershipType: 'lifetime' | 'annual' | undefined;
}) {
  if (!process.env.RESEND_API_KEY || !params.alumniId) {
    return { sent: false };
  }

  try {
    const admin = createAdminClient();
    const [{ data: profile }, { data: plan }] = await Promise.all([
      admin
        .from('profiles')
        .select('full_name, email')
        .eq('id', params.alumniId)
        .maybeSingle(),
      params.planId
        ? admin
            .from('membership_plans')
            .select('name')
            .eq('id', params.planId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (!profile?.email) {
      return { sent: false };
    }

    const PaymentReceiptEmail = (await import('@/emails/PaymentReceiptEmail')).default;
    const resend = getResend();
    const now = new Date().toISOString();
    const receiptUrl = `${APP_URL}/membership/receipt/${encodeURIComponent(params.txnid)}`;

    // When PDF delivery is enabled later, this is the hook to attach a generated receipt file.
    await resend.emails.send({
      from: FROM_EMAIL,
      to: profile.email,
      subject: 'DAVKAWT Payment Receipt',
      react: PaymentReceiptEmail({
        fullName: profile.full_name,
        txnid: params.txnid,
        amount: String(params.amount ?? ''),
        planName: plan?.name ?? 'Membership Plan',
        paymentDate: new Date(now).toLocaleString('en-IN'),
        membershipType: params.membershipType ?? 'annual',
        portalUrl: APP_URL,
      }),
    });

    await admin
      .from('payments')
      .update({
        receipt_url: receiptUrl,
        receipt_sent_at: now,
        updated_at: now,
      })
      .eq('txnid', params.txnid);

    return { sent: true };
  } catch (error) {
    console.error('[payments/receipt-email]', error);
    return { sent: false };
  }
}
