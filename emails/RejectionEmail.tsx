import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './BaseEmail';

interface RejectionEmailProps {
  name: string;
  reason: string;
  contactEmail: string;
}

export default function RejectionEmail({ name, reason, contactEmail }: RejectionEmailProps) {
  return (
    <BaseEmail preview="Update on your DAVKAWT registration">
      <Heading className="m-0 text-xl text-slate-900">Registration Update</Heading>
      <Text className="text-slate-700">Dear {name},</Text>
      <Text className="text-slate-700">
        After review, we were unable to approve your registration on the DAVKAWT Alumni Portal at
        this time.
      </Text>
      <Section className="my-6 rounded-lg border border-rose-100 bg-rose-50 p-4">
        <Text className="m-0 text-sm text-rose-800">
          <strong>Reason:</strong> {reason}
        </Text>
      </Section>
      <Text className="text-slate-700">
        If you believe this is an error, please reply to this email or write to us at{' '}
        <a href={`mailto:${contactEmail}`} className="text-[#0F2557] underline">
          {contactEmail}
        </a>
        .
      </Text>
    </BaseEmail>
  );
}
