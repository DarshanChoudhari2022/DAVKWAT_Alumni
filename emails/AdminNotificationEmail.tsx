import { Button, Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './BaseEmail';

interface AdminNotificationEmailProps {
  alumniName: string;
  batchYear: number;
  course: string;
  email: string;
  approvalsUrl: string;
}

export default function AdminNotificationEmail({
  alumniName,
  batchYear,
  course,
  email,
  approvalsUrl,
}: AdminNotificationEmailProps) {
  return (
    <BaseEmail preview={`New registration from ${alumniName} — needs review`}>
      <Heading className="m-0 text-xl text-slate-900">New Registration Pending</Heading>
      <Text className="text-slate-700">
        A new alumni registration has been submitted and requires your review.
      </Text>
      <Section className="my-6 rounded-lg bg-slate-50 p-4">
        <Text className="m-0 text-sm text-slate-600">
          <strong>Name:</strong> {alumniName}
          <br />
          <strong>Email:</strong> {email}
          <br />
          <strong>Batch:</strong> {batchYear}
          <br />
          <strong>Course:</strong> {course}
        </Text>
      </Section>
      <Button
        href={approvalsUrl}
        className="rounded-lg bg-[#0F2557] px-6 py-3 text-sm font-medium text-white"
      >
        Review Approval Queue
      </Button>
    </BaseEmail>
  );
}
