'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AnnouncementFormProps {
  initial?: {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
  };
}

export function AnnouncementForm({ initial }: AnnouncementFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [isPinned, setIsPinned] = useState(initial?.is_pinned ?? false);
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
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) + '-' + Date.now().toString(36);

      const payload = {
        title: title.trim(),
        content: content.trim(),
        is_pinned: isPinned,
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

      if (!res.ok) {
        const data = await res.json();
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

        <div className="flex items-center gap-2">
          <input
            id="isPinned"
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="isPinned" className="text-sm text-slate-700">
            Pin this announcement
          </label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Update Announcement' : 'Create Announcement'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/announcements')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
