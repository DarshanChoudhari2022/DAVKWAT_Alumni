'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface PayButtonProps {
  planId: string;
  planName: string;
  amount: number;
}

export function PayButton({ planId, planName: _planName, amount }: PayButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error ?? 'Failed to initiate payment.');
          return;
        }

        // Redirect to Easebuzz payment page
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else if (data.accessKey) {
          // Easebuzz v2 — post to their pay URL
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = process.env.NEXT_PUBLIC_EASEBUZZ_PAY_URL ?? 'https://pay.easebuzz.in/pay/initiateLink';
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'access_key';
          input.value = data.accessKey;
          form.appendChild(input);
          document.body.appendChild(form);
          form.submit();
        } else {
          setError('Unexpected payment gateway response.');
        }
      } catch {
        setError('Network error. Please try again.');
      }
    });
  }

  return (
    <div>
      <Button
        onClick={handlePay}
        disabled={isPending}
        className="w-full"
        variant="primary"
      >
        {isPending ? 'Processing…' : `Pay ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)}`}
      </Button>
      {error && (
        <p className="mt-2 text-center text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
