'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { readApiResponse } from '@/lib/utils/api-client';

export function ManualPaymentStatusActions({
  paymentId,
  currentStatus,
}: {
  paymentId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function updateStatus(nextStatus: 'pending' | 'success' | 'failed') {
    const previousStatus = status;
    setStatus(nextStatus);
    startTransition(async () => {
      const response = await fetch('/api/admin/payments/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, status: nextStatus }),
      });
      const data = await readApiResponse<{ error?: string }>(response);
      if (!response.ok) {
        setStatus(previousStatus);
        window.alert(data.error ?? 'Could not update payment status.');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        type="button"
        size="sm"
        variant={status === 'success' ? 'primary' : 'outline'}
        disabled={isPending}
        onClick={() => updateStatus('success')}
      >
        Yes
      </Button>
      <Button
        type="button"
        size="sm"
        variant={status === 'failed' ? 'destructive' : 'outline'}
        disabled={isPending}
        onClick={() => updateStatus('failed')}
      >
        No
      </Button>
      <Button
        type="button"
        size="sm"
        variant={status === 'pending' ? 'accent' : 'outline'}
        disabled={isPending}
        onClick={() => updateStatus('pending')}
      >
        Pending
      </Button>
    </div>
  );
}
