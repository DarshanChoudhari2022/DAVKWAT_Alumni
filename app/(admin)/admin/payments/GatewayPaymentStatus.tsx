'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function GatewayPaymentStatus({ txnid, status, createdAt, checkedAt, error, gatewayStatus, failureReason }: {
  txnid: string; status: string; createdAt: string; checkedAt: string | null;
  error: string | null; gatewayStatus: string | null; failureReason: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const needsAttention = status === 'pending' && Date.now() - Date.parse(createdAt) >= 15 * 60_000;
  return <div className="min-w-[180px] space-y-1 text-xs text-slate-500">
    <p>Automatic via Easebuzz</p>
    {gatewayStatus && <p>Gateway: {gatewayStatus}</p>}
    <p>{checkedAt ? `Last checked: ${new Date(checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : 'Not yet verified'}</p>
    {failureReason && <p className="text-rose-700">{failureReason}</p>}
    {error && <p className="text-amber-700">Verification issue: {error}</p>}
    {needsAttention && <p className="font-semibold text-amber-700">Needs attention · unresolved over 15 minutes</p>}
    {!['success', 'refunded'].includes(status) && <Button type="button" size="sm" variant="outline" loading={pending} onClick={() => startTransition(async () => {
      try {
        const response = await fetch('/api/admin/payments/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ txnid }) });
        const result = await response.json();
        setMessage(response.ok ? result.verificationPending ? 'Gateway unavailable; payment remains unresolved.' : `Payment status: ${result.status}` : result.error ?? 'Could not verify payment.');
        router.refresh();
      } catch { setMessage('Network error. Please retry checking; no payment status was changed.'); }
    })}>Check with Easebuzz</Button>}
    {message && <p role="status">{message}</p>}
  </div>;
}
