import { Section, Text, Link, Button } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './BaseEmail';

interface MembershipRenewalEmailProps {
  fullName: string;
  expiryDate: string;
  daysRemaining: number;
  planName: string;
  renewalUrl: string;
  portalUrl?: string;
}

export function MembershipRenewalEmail({
  fullName,
  expiryDate,
  daysRemaining,
  planName,
  renewalUrl,
  portalUrl = 'https://davkawtalumni.org',
}: MembershipRenewalEmailProps) {
  return (
    <BaseEmail preview={`Your DAVKAWT membership expires in ${daysRemaining} days`}>
      <Section>
        <Text className="m-0 text-lg font-semibold text-slate-900">
          Membership Renewal Reminder
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          Dear {fullName},
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          Your DAVKAWT Alumni Portal membership ({planName}) will expire on{' '}
          <strong>{expiryDate}</strong> — that's{' '}
          <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> from now.
        </Text>
      </Section>

      <Section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <Text className="m-0 text-sm font-semibold text-amber-800">
          ⏰ Expiring Soon
        </Text>
        <Text className="m-0 mt-1 text-sm text-slate-600">
          Plan: {planName}
        </Text>
        <Text className="m-0 mt-1 text-sm text-slate-600">
          Expiry: {expiryDate}
        </Text>
      </Section>

      <Section className="mt-4">
        <Text className="m-0 text-sm text-slate-600">
          Renew now to continue enjoying all alumni benefits including the directory,
          events, and forum access.
        </Text>
      </Section>

      <Section className="mt-4 text-center">
        <Button
          href={renewalUrl}
          className="inline-block rounded-lg bg-amber-500 px-6 py-3 text-sm font-medium text-white"
        >
          Renew Membership
        </Button>
      </Section>

      <Section className="mt-4">
        <Text className="m-0 text-sm text-slate-500">
          If you've already renewed, please disregard this email. For any questions,
          contact us at{' '}
          <Link href="mailto:admin@davkawt.org" className="text-[#0F2557] underline">
            admin@davkawt.org
          </Link>.
        </Text>
      </Section>
    </BaseEmail>
  );
}

export default MembershipRenewalEmail;
