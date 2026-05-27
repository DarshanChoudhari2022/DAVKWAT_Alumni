'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { postReply } from './actions';

interface ReplyFormProps {
  threadId: string;
  categorySlug: string;
}

export function ReplyForm({ threadId, categorySlug: _categorySlug }: ReplyFormProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError('Reply cannot be empty.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await postReply({ threadId, content: content.trim() });
      if (result?.error) {
        setError(result.error);
      } else {
        setContent('');
        router.refresh();
      }
    });
  }

  return (
    <Card className="mt-6 p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold">Post a Reply</h3>
      {error && (
        <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="mt-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Write your reply…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-slate-400">{content.length}/2000</span>
          <Button type="submit" disabled={isPending} size="sm">
            {isPending ? 'Posting…' : 'Reply'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
