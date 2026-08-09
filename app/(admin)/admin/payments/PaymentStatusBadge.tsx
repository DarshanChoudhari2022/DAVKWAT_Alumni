'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export const PAYMENT_STATUS_EVENT = 'davkawt:payment-status';

interface PaymentStatusDetail {
  paymentId: string;
  status: string;
}

export function publishPaymentStatus(paymentId: string, status: string) {
  window.dispatchEvent(
    new CustomEvent<PaymentStatusDetail>(PAYMENT_STATUS_EVENT, {
      detail: { paymentId, status },
    })
  );
}

export function PaymentStatusBadge({
  paymentId,
  initialStatus,
}: {
  paymentId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<PaymentStatusDetail>).detail;
      if (detail.paymentId === paymentId) setStatus(detail.status);
    };

    window.addEventListener(PAYMENT_STATUS_EVENT, handleStatus);
    return () => window.removeEventListener(PAYMENT_STATUS_EVENT, handleStatus);
  }, [paymentId]);

  return (
    <Badge
      variant={
        status === 'success'
          ? 'success'
          : status === 'failed'
            ? 'error'
            : status === 'refunded'
              ? 'default'
              : 'warning'
      }
    >
      {status}
    </Badge>
  );
}
