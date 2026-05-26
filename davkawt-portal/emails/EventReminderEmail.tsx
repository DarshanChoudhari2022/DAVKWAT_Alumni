import { Section, Text, Link, Button } from '@react-email/components';
import * as React from 'react';
import { BaseEmail } from './BaseEmail';

interface EventReminderEmailProps {
  fullName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue?: string;
  onlineLink?: string;
  eventUrl: string;
  portalUrl?: string;
}

export function EventReminderEmail({
  fullName,
  eventTitle,
  eventDate,
  eventTime,
  venue,
  onlineLink,
  eventUrl,
  portalUrl = 'https://davkawtalumni.org',
}: EventReminderEmailProps) {
  return (
    <BaseEmail preview={`Reminder: ${eventTitle} is tomorrow!`}>
      <Section>
        <Text className="m-0 text-lg font-semibold text-slate-900">
          Event Reminder
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          Dear {fullName},
        </Text>
        <Text className="mt-2 text-sm text-slate-600">
          This is a friendly reminder that you're registered for an upcoming DAVKAWT event happening tomorrow.
        </Text>
      </Section>

      <Section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <Text className="m-0 text-base font-semibold text-slate-900">
          {eventTitle}
        </Text>
        <Text className="m-0 mt-2 text-sm text-slate-600">
          📅 {eventDate} at {eventTime}
        </Text>
        {venue && (
          <Text className="m-0 mt-1 text-sm text-slate-600">
            📍 {venue}
          </Text>
        )}
        {onlineLink && (
          <Text className="m-0 mt-1 text-sm text-slate-600">
            💻 Online:{' '}
            <Link href={onlineLink} className="text-[#0F2557] underline">
              Join Meeting
            </Link>
          </Text>
        )}
      </Section>

      <Section className="mt-4 text-center">
        <Button
          href={eventUrl}
          className="inline-block rounded-lg bg-[#0F2557] px-6 py-3 text-sm font-medium text-white"
        >
          View Event Details
        </Button>
      </Section>

      <Section className="mt-4">
        <Text className="m-0 text-sm text-slate-500">
          We look forward to seeing you there!
        </Text>
      </Section>
    </BaseEmail>
  );
}

export default EventReminderEmail;
