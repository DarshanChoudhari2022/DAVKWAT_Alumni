import { Section, Text, Hr, Link } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './BaseEmail';

interface PaymentReceiptEmailProps {
  fullName: string;
  txnid: string;
  amount: string;
  planName: string;
  paymentDate: string;
  membershipType: string;
  portalUrl?: string;
}

export function PaymentReceiptEmail({
  fullName,
  txnid,
  amount,
  planName,
  paymentDate,
  membershipType,
  portalUrl = 'https://davkawtalumni.org',
}: PaymentReceiptEmailProps) {
  return (
    <BaseEmail preview={`Payment receipt — ₹${amount} for ${planName}`}>
      <Section>
        <Text className="m-0 text-lg font-semibold text-slate-900">
          Payment Receipt
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          Dear {fullName},
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          Thank you for your payment. Your membership has been activated successfully.
        </Text>
      </Section>

      <Section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <Text className="m-0 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Transaction Details
        </Text>
        <Hr className="my-3 border-slate-200" />
        <table cellPadding={0} cellSpacing={0} style={{ width: '100%' }}>
          <tbody>
            <DetailRow label="Transaction ID" value={txnid} />
            <DetailRow label="Plan" value={planName} />
            <DetailRow label="Type" value={membershipType} />
            <DetailRow label="Amount" value={`₹${amount}`} />
            <DetailRow label="Date" value={paymentDate} />
            <DetailRow label="Status" value="Success ✓" />
          </tbody>
        </table>
      </Section>

      <Section className="mt-4">
        <Text className="m-0 text-sm text-slate-600">
          You can view your membership details anytime in your{' '}
          <Link href={`${portalUrl}/membership`} className="text-[#0F2557] underline">
            membership dashboard
          </Link>.
        </Text>
        <Text className="mt-3 text-sm text-slate-600">
          If you have questions about this payment, contact us at{' '}
          <Link href="mailto:admin@davkawt.org" className="text-[#0F2557] underline">
            admin@davkawt.org
          </Link>.
        </Text>
      </Section>
    </BaseEmail>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td style={{ padding: '4px 0', fontSize: '13px', color: '#64748b', width: '140px' }}>
        {label}
      </td>
      <td style={{ padding: '4px 0', fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>
        {value}
      </td>
    </tr>
  );
}

export default PaymentReceiptEmail;
