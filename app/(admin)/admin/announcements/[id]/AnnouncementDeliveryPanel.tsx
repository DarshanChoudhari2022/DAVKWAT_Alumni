'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

type DeliverySegment =
  | 'all'
  | 'paid_members'
  | 'free_members'
  | 'batch_year'
  | 'course'
  | 'city';

const SEGMENT_LABELS: Record<DeliverySegment, string> = {
  all: 'All verified alumni',
  paid_members: 'Paid members',
  free_members: 'Free members',
  batch_year: 'Batch year',
  course: 'Course',
  city: 'City',
};

export function AnnouncementDeliveryPanel({
  announcementId,
}: {
  announcementId: string;
}) {
  const [segment, setSegment] = useState<DeliverySegment>('all');
  const [segmentValue, setSegmentValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsValue = segment === 'batch_year' || segment === 'course' || segment === 'city';

  function handleSend() {
    setError(null);
    setResult(null);

    startTransition(async () => {
      const response = await fetch(`/api/admin/announcements/${announcementId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment,
          segmentValue: needsValue ? segmentValue : '',
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not send the announcement email.');
        return;
      }

      setResult(`Sent ${data.sent} emails${data.failed ? `, ${data.failed} failed` : ''}.`);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="font-display text-lg font-semibold">Email This Announcement</h2>
      <p className="mt-1 text-sm text-slate-500">
        Send the published announcement to verified alumni by segment once Resend credentials are configured.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-[220px,1fr,auto]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Audience</span>
          <select
            value={segment}
            onChange={(event) => setSegment(event.target.value as DeliverySegment)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            {needsValue ? 'Segment value' : 'Segment value'}
          </span>
          <input
            value={segmentValue}
            onChange={(event) => setSegmentValue(event.target.value)}
            disabled={!needsValue}
            placeholder={
              segment === 'batch_year'
                ? 'Example: 2012'
                : segment === 'course'
                  ? 'Example: B.Tech'
                  : segment === 'city'
                    ? 'Example: Patna'
                    : 'Not required for this audience'
            }
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400"
          />
        </label>

        <div className="flex items-end">
          <Button type="button" onClick={handleSend} disabled={isPending} className="w-full md:w-auto">
            {isPending ? 'Sending...' : 'Send email'}
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      {result && <p className="mt-3 text-sm text-emerald-600">{result}</p>}
    </div>
  );
}
