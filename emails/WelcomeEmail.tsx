import { Button, Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './BaseEmail';

interface WelcomeEmailProps {
  name: string;
  batchYear: number;
  course: string;
}

export default function WelcomeEmail({ name, batchYear, course }: WelcomeEmailProps) {
  return (
    <BaseEmail preview="Welcome to DAVKAWT — your registration is under review">
      <Heading className="m-0 text-2xl text-slate-900">Welcome, {name}!</Heading>
      <Text className="text-slate-700">
        Thank you for registering on the DAVKAWT Alumni Portal. Your details have been received and
        are now under review by our team.
      </Text>
      <Section className="my-6 rounded-lg bg-slate-50 p-4">
        <Text className="m-0 text-sm text-slate-600">
          <strong>Batch:</strong> {batchYear}
          <br />
          <strong>Course:</strong> {course}
        </Text>
      </Section>
      <Text className="text-slate-700">
        We typically review and approve registrations within <strong>2-3 working days</strong>. You
        will receive an email once your account is activated.
      </Text>
      <Text className="text-slate-700">
        If you have questions, simply reply to this email.
      </Text>
    </BaseEmail>
  );
}
