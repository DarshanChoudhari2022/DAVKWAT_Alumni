'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createThread } from './actions';

interface NewThreadButtonProps {
  categoryId: string;
  categorySlug: string;
}

export function NewThreadButton({ categoryId, categorySlug: _categorySlug }: NewThreadButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createThread({
        categoryId,
        title: title.trim(),
        content: content.trim(),
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setTitle('');
        setContent('');
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden className="h-4 w-4" />
        New Thread
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 className="font-display text-xl font-semibold">New Thread</h2>

        {error && (
          <p className="mt-2 text-sm text-rose-600" role="alert">
            {error}
          </p>
        )}

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Thread title"
            className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
            autoFocus
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Content</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={6}
            placeholder="Share your thoughts…"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
          />
          <span className="mt-1 block text-right text-xs text-slate-400">
            {content.length}/5000
          </span>
        </label>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Posting…' : 'Post Thread'}
          </Button>
        </div>
      </form>
    </div>
  );
}
