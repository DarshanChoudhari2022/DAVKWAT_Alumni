import { Button, Heading, Text } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './BaseEmail';

interface AnnouncementEmailProps {
  recipientName: string;
  title: string;
  excerpt: string;
  announcementUrl: string;
}

export default function AnnouncementEmail({
  recipientName,
  title,
  excerpt,
  announcementUrl,
}: AnnouncementEmailProps) {
  return (
    <BaseEmail preview={`New DAVKAWT announcement: ${title}`}>
      <Heading className="m-0 text-2xl text-slate-900">{title}</Heading>
      <Text className="text-slate-700">Hello {recipientName},</Text>
      <Text className="text-slate-700">
        A new DAVKAWT announcement has been shared for verified alumni.
      </Text>
      <Text className="text-slate-700">{excerpt}</Text>
      <Button
        href={announcementUrl}
        className="rounded-lg bg-[#0F2557] px-6 py-3 text-sm font-medium text-white"
      >
        Read announcement
      </Button>
    </BaseEmail>
  );
}
