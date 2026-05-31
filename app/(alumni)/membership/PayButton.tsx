'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PayButtonProps {
  planId: string;
  planName: string;
  amount: number;
  hasPendingRequest?: boolean;
}

export function PayButton({
  planId,
  planName,
  amount,
  hasPendingRequest = false,
}: PayButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmitRequest() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error ?? 'Failed to submit your membership request.');
          return;
        }

        setSuccess(
          data.message ??
            `${planName} has been submitted to the DAVKAWT admin team for manual payment follow-up.`
        );
        router.refresh();
      } catch {
        setError('Network error. Please try again.');
      }
    });
  }

  if (hasPendingRequest) {
    return (
      <div>
        <Button className="w-full" variant="outline" disabled>
          Request submitted for {new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
          }).format(amount)}
        </Button>
        <p className="mt-2 text-center text-sm text-slate-500" role="status">
          The admin team already has this membership request.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Button onClick={handleSubmitRequest} disabled={isPending} className="w-full" variant="primary">
        {isPending
          ? 'Submitting request...'
          : `Request ${new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(amount)} plan`}
      </Button>
      {success && (
        <p className="mt-2 text-center text-sm text-emerald-600" role="status">
          {success}
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
