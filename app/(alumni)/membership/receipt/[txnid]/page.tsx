import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatINR } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Payment Receipt' };

export default async function MembershipReceiptPage({
  params,
}: {
  params: Promise<{ txnid: string }>;
}) {
  const { txnid } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/membership/receipt/${encodeURIComponent(txnid)}`);
  }

  const { data: payment } = await supabase
    .from('payments')
    .select(
      'id, txnid, amount, currency, status, payment_mode, bank_ref_num, created_at, membership_plans(name, membership_type)'
    )
    .eq('txnid', txnid)
    .eq('alumni_id', user.id)
    .maybeSingle();

  if (!payment) {
    notFound();
  }

  const plan =
    payment.membership_plans && !Array.isArray(payment.membership_plans)
      ? payment.membership_plans
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Payment Receipt</h1>
          <p className="mt-1 text-sm text-slate-500">
            Keep this receipt for your DAVKAWT membership records.
          </p>
        </div>
        <Link href="/membership" className="text-sm font-medium text-[#0F2557] hover:underline">
          Back to Membership
        </Link>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm text-slate-500">Receipt number</p>
            <p className="font-mono text-sm">{payment.txnid}</p>
          </div>
          <Badge
            variant={
              payment.status === 'success'
                ? 'success'
                : payment.status === 'failed'
                  ? 'error'
                  : payment.status === 'refunded'
                    ? 'default'
                    : 'warning'
            }
          >
            {payment.status}
          </Badge>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Membership plan</dt>
            <dd className="mt-1 font-medium text-slate-900">{plan?.name ?? 'Membership Plan'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Membership type</dt>
            <dd className="mt-1 font-medium capitalize text-slate-900">
              {plan?.membership_type ?? 'annual'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Amount paid</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatINR(Number(payment.amount))} {payment.currency}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Payment date</dt>
            <dd className="mt-1 font-medium text-slate-900">{formatDate(payment.created_at)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Payment mode</dt>
            <dd className="mt-1 font-medium capitalize text-slate-900">
              {payment.payment_mode?.replace(/_/g, ' ') ?? 'Manual review'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Bank reference</dt>
            <dd className="mt-1 font-medium text-slate-900">{payment.bank_ref_num ?? '-'}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
