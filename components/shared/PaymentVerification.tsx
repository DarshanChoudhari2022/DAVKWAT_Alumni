'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function PaymentVerification() {
  const router = useRouter();
  const [message, setMessage] = useState('Checking your payment with Easebuzz… If money was debited, do not pay again.');
  useEffect(() => {
    const controller = new AbortController();
    let attempts = 0;
    let complete = false;
    let inFlight = false;
    async function check() {
      if (attempts >= 5 || complete || inFlight) return;
      attempts++;
      inFlight = true;
      try {
        const response = await fetch('/api/payments/reconcile', { method: 'POST', signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (response.ok && result.status === 'success') {
          complete = true;
          setMessage('Payment confirmed. Updating your membership…');
          router.refresh();
        } else if (response.ok && result.status === 'failed' && !result.verificationPending) {
          complete = true;
          setMessage('Easebuzz reports that your payment attempt failed. You can retry securely below. If debited, contact the Trust before paying again.');
        } else if (response.ok && result.hasPayments === false) {
          complete = true;
          setMessage('No Easebuzz payment attempt was found for this account.');
        } else {
          setMessage('Awaiting payment confirmation. We will check again automatically. If debited, do not pay again.');
        }
      } catch {
        if (!controller.signal.aborted) setMessage('Unable to check payment right now. Your payment has not been marked failed. If debited, do not pay again.');
      } finally { inFlight = false; }
    }
    void check();
    const interval = setInterval(() => { void check(); }, 30_000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [router]);
  return <p role="status" className="my-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">{message}</p>;
}
