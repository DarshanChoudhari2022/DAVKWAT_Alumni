'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const EVENT_TYPES = ['in_person', 'online', 'hybrid'] as const;

interface EventFormProps {
  initial?: {
    id: string;
    title: string;
    description: string;
    event_type: string;
    venue: string;
    online_link: string;
    starts_at: string;
    ends_at: string;
    max_attendees: number | null;
  };
}

export function EventForm({ initial }: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [eventType, setEventType] = useState(initial?.event_type ?? 'in_person');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [onlineUrl, setOnlineUrl] = useState(initial?.online_link ?? '');
  const [startsAt, setStartsAt] = useState(initial?.starts_at ? initial.starts_at.slice(0, 16) : '');
  const [endsAt, setEndsAt] = useState(initial?.ends_at ? initial.ends_at.slice(0, 16) : '');
  const [capacity, setCapacity] = useState(initial?.max_attendees?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isEdit = !!initial?.id;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !startsAt) {
      setError('Title and start date are required.');
      return;
    }
    setError(null);

    startTransition(async () => {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) + '-' + Date.now().toString(36);

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        venue: venue.trim() || null,
        online_link: onlineUrl.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        max_attendees: capacity ? parseInt(capacity, 10) : null,
        slug: isEdit ? undefined : slug,
      };

      const url = isEdit && initial
        ? `/api/admin/events/${initial.id}`
        : '/api/admin/events';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      router.push('/admin/events');
      router.refresh();
    });
  }

  const inputCls = 'h-10 w-full rounded-lg border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]';

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>}

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="event_type" className="mb-1 block text-sm font-medium text-slate-700">Event Type</label>
            <select id="event_type" value={eventType} onChange={(e) => setEventType(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t === 'in_person' ? 'In Person' : t === 'online' ? 'Online' : 'Hybrid'}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="capacity" className="mb-1 block text-sm font-medium text-slate-700">Max Attendees (optional)</label>
            <input id="capacity" type="number" min="0" value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputCls} />
          </div>
        </div>

        {(eventType === 'in_person' || eventType === 'hybrid') && (
          <div>
            <label htmlFor="venue" className="mb-1 block text-sm font-medium text-slate-700">Venue</label>
            <input id="venue" type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} />
          </div>
        )}

        {(eventType === 'online' || eventType === 'hybrid') && (
          <div>
            <label htmlFor="online_link" className="mb-1 block text-sm font-medium text-slate-700">Online Link (Zoom, Meet, etc.)</label>
            <input id="online_link" type="url" value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} className={inputCls} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="starts_at" className="mb-1 block text-sm font-medium text-slate-700">Start Date & Time</label>
            <input id="starts_at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label htmlFor="ends_at" className="mb-1 block text-sm font-medium text-slate-700">End Date & Time (optional)</label>
            <input id="ends_at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Update Event' : 'Create Event'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/events')}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
