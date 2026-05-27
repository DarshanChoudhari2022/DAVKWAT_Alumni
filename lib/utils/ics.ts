/**
 * Minimal RFC-5545 iCalendar generator. Returns text suitable for download.
 * No external deps — keeps bundle small.
 */
interface ICSEventInput {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  url?: string | null;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toICSDate(d: Date): string {
  // YYYYMMDDTHHmmssZ in UTC
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

export function buildICS(event: ICSEventInput): string {
  const dtstart = toICSDate(event.startsAt);
  const dtend = toICSDate(event.endsAt ?? new Date(event.startsAt.getTime() + 60 * 60 * 1000));
  const now = toICSDate(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DAVKAWT//Alumni Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@davkawt.org`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(event.title)}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}
