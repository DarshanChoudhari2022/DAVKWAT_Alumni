'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface PayButtonProps {
  planId?: string;
  membershipType?: 'annual' | 'lifetime';
  planName: string;
  amount: number;
  hasPendingRequest?: boolean;
}

export function PayButton({ planId, membershipType, planName, amount }: PayButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pay() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch('/api/payments/initiate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, membershipType }),
        });
        const data = await response.json();
        if (!response.ok || !data.redirectUrl) {
          setError(data.error ?? 'Checkout could not be started. Please try again.');
          return;
        }
        window.location.assign(data.redirectUrl);
      } catch {
        setError('Network error. Please try again.');
      }
    });
  }

  return (
    <div>
      <Button onClick={pay} loading={isPending} className="w-full" aria-label={`Pay for ${planName}`}>
        Pay ₹{amount.toLocaleString('en-IN')}
      </Button>
      {error && <p className="mt-2 text-center text-sm text-rose-600" role="alert">{error}</p>}
    </div>
  );
}
