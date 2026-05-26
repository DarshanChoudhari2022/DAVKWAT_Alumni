import { Button, Heading, Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './BaseEmail';

interface ApprovalEmailProps {
  name: string;
  loginUrl: string;
}

export default function ApprovalEmail({ name, loginUrl }: ApprovalEmailProps) {
  return (
    <BaseEmail preview="Your DAVKAWT alumni account is approved">
      <Heading className="m-0 text-2xl text-slate-900">Welcome to the network, {name}!</Heading>
      <Text className="text-slate-700">
        Congratulations — your DAVKAWT Alumni Portal account has been <strong>approved</strong>. You
        now have full access to the alumni directory, events, forum, and announcements.
      </Text>
      <Button
        href={loginUrl}
        className="rounded-lg bg-[#0F2557] px-6 py-3 text-sm font-medium text-white"
      >
        Login to Portal
      </Button>
      <Text className="mt-6 text-slate-700">
        We recommend completing your profile so fellow alumni can find and connect with you.
      </Text>
    </BaseEmail>
  );
}
