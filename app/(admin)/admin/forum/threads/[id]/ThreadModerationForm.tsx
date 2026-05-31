'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

interface ThreadModerationFormProps {
  thread: {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    is_locked: boolean;
  };
}

export function ThreadModerationForm({ thread }: ThreadModerationFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const payload = {
      title: String(formData.get('title') ?? ''),
      content: String(formData.get('content') ?? ''),
      is_pinned: formData.get('is_pinned') === 'on',
      is_locked: formData.get('is_locked') === 'on',
    };

    startTransition(async () => {
      const response = await fetch(`/api/admin/forum/threads/${thread.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not update the thread.');
        return;
      }

      setSuccess('Thread updated successfully.');
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Thread title</span>
          <input
            name="title"
            defaultValue={thread.title}
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Thread content</span>
          <textarea
            name="content"
            defaultValue={thread.content}
            rows={8}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="is_pinned" defaultChecked={thread.is_pinned} />
          Pin thread
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="is_locked" defaultChecked={thread.is_locked} />
          Lock replies
        </label>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save moderation changes'}
      </Button>
    </form>
  );
}
