import type { Metadata } from 'next';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Refund Policy — DAVKAWT' };

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-sans text-3xl font-bold tracking-[-0.025em] sm:text-4xl">
        Refund Policy
      </h1>
      <Card className="mt-8 p-6 sm:p-8">
        <div className="prose-davkawt max-w-none text-sm leading-relaxed">
          <p>Last updated: January 2025</p>

          <h2>1. General Policy</h2>
          <p>
            Membership fees paid through the DAVKAWT Alumni Portal are generally
            <strong> non-refundable</strong> once the payment has been successfully
            processed and membership activated.
          </p>

          <h2>2. Eligible Refund Scenarios</h2>
          <p>Refunds may be considered in the following cases:</p>
          <ul>
            <li>
              <strong>Duplicate payment:</strong> If you were charged more than once for the
              same membership plan due to a technical error.
            </li>
            <li>
              <strong>Incorrect amount:</strong> If the amount debited does not match the
              published plan price at the time of payment.
            </li>
            <li>
              <strong>Payment processed but membership not activated:</strong> If your payment
              was marked as successful by the gateway but your membership status was not updated
              within 48 hours.
            </li>
          </ul>

          <h2>3. How to Request a Refund</h2>
          <p>
            To request a refund, email{' '}
            <a href="mailto:admin@davkawt.org" className="text-[#0F2557] hover:underline">
              admin@davkawt.org
            </a>{' '}
            with:
          </p>
          <ul>
            <li>Your registered email address</li>
            <li>Transaction ID (visible in your membership page)</li>
            <li>Reason for the refund request</li>
            <li>Screenshot of the payment confirmation (if available)</li>
          </ul>

          <h2>4. Processing Time</h2>
          <p>
            Approved refunds will be processed within <strong>7-10 business days</strong> to
            the original payment method. You will receive an email confirmation once the
            refund has been initiated.
          </p>

          <h2>5. Non-Refundable Items</h2>
          <ul>
            <li>Lifetime membership fees (unless covered by Section 2 above)</li>
            <li>Partial membership periods already used</li>
            <li>Voluntary donations or contributions</li>
          </ul>

          <h2>6. Contact</h2>
          <p>
            For any questions about refunds, contact us at{' '}
            <a href="mailto:admin@davkawt.org" className="text-[#0F2557] hover:underline">
              admin@davkawt.org
            </a>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
