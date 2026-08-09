'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { readApiResponse } from '@/lib/utils/api-client';

interface AnnouncementFormProps {
  events?: Array<{ id: string; title: string; starts_at: string }>;
  initial?: {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    is_published: boolean;
    cover_image_url?: string | null;
    scheduled_for?: string | null;
    rsvp_event_id?: string | null;
  };
}

export function AnnouncementForm({ initial, events = [] }: AnnouncementFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.cover_image_url ?? '');
  const [scheduledFor, setScheduledFor] = useState(
    initial?.scheduled_for ? initial.scheduled_for.slice(0, 16) : ''
  );
  const [isPinned, setIsPinned] = useState(initial?.is_pinned ?? false);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [rsvpEventId, setRsvpEventId] = useState(initial?.rsvp_event_id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isEdit = !!initial?.id;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }

    setError(null);

    startTransition(async () => {
      const slug =
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80) +
        '-' +
        Date.now().toString(36);

      const payload = {
        title: title.trim(),
        content: content.trim(),
        cover_image_url: coverImageUrl.trim() || null,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        rsvp_event_id: rsvpEventId || null,
        is_pinned: isPinned,
        is_published: isPublished,
        slug: isEdit ? undefined : slug,
      };

      const url = isEdit && initial
        ? `/api/admin/announcements/${initial.id}`
        : '/api/admin/announcements';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readApiResponse<{ error?: string }>(res);
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }

      router.push('/admin/announcements');
      router.refresh();
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
        )}

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-10 w-full rounded-lg border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </div>

        <div>
          <label htmlFor="cover_image_url" className="mb-1 block text-sm font-medium text-slate-700">
            Cover Image URL
          </label>
          <input
            id="cover_image_url"
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            className="h-10 w-full rounded-lg border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </div>

        <div>
          <label htmlFor="content" className="mb-1 block text-sm font-medium text-slate-700">
            Content (HTML supported)
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            required
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="scheduled_for" className="mb-1 block text-sm font-medium text-slate-700">
              Schedule Publish Time
            </label>
            <input
              id="scheduled_for"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            />
            <p className="mt-1 text-xs text-slate-500">
              If a future time is set, this announcement will stay hidden until then.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                id="isPinned"
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Pin this announcement
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                id="isPublished"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Mark as published
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="rsvp_event_id" className="mb-1 block text-sm font-medium text-slate-700">
            RSVP event
          </label>
          <select
            id="rsvp_event_id"
            value={rsvpEventId}
            onChange={(event) => setRsvpEventId(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">No RSVP form</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} - {new Date(event.starts_at).toLocaleDateString('en-IN')}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Link an event to show its RSVP form below this announcement.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
          <div className="grid gap-3 sm:flex">
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? 'Saving...' : isEdit ? 'Update Announcement' : 'Create Announcement'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/announcements')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
          {isEdit && initial && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!confirm('Are you sure you want to delete this announcement?')) return;
                startTransition(async () => {
                  setError(null);
                  const res = await fetch(`/api/admin/announcements/${initial.id}`, { method: 'DELETE' });
                  if (res.ok) {
                    router.push('/admin/announcements');
                    router.refresh();
                  } else {
                    setError('Failed to delete announcement.');
                  }
                });
              }}
              disabled={isPending}
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? 'Deleting...' : 'Delete Announcement'}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
